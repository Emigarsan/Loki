package com.example.counter.service.snapshot;

import com.example.counter.service.CounterService;
import com.example.counter.service.TablesService;
import com.example.counter.service.mesa.MesaCounterService;
import com.example.counter.service.mesa.MesaCounterService.Event;
import com.example.counter.service.mesa.MesaCounterService.TotalesMesa;
import com.example.counter.service.model.CounterState;
import com.example.counter.service.model.FreeGameTable;
import com.example.counter.service.model.RegisterTable;
import com.example.counter.service.sector.SectorService;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.boot.context.event.ApplicationReadyEvent;

import java.io.IOException;
import java.nio.file.*;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class SnapshotService {

    private static final Logger log = LoggerFactory.getLogger(SnapshotService.class);

    private final CounterService counterService;
    private final TablesService tablesService;
    private final MesaCounterService mesaService;
    private final SectorService sectorService;
        private final ObjectMapper objectMapper = new ObjectMapper()
            .registerModule(new JavaTimeModule())
            .configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);

    private final Path backupDir;
    private final long backupEveryMs;
    private final int backupRetentionMin;
    private final Path driveDir;
    private final long driveEveryMs;
    private final int driveKeepCopies;
    private final boolean backupInitial;
    private final boolean restoreOnStart;

    private volatile Path lastSnapshotPath = null;

    public SnapshotService(CounterService counterService,
                           TablesService tablesService,
                           MesaCounterService mesaService,
                           SectorService sectorService,
                           @Value("${backup.dir:backups}") String backupDir,
                           @Value("${backup.every.ms:60000}") long backupEveryMs,
                           @Value("${backup.retention.min:60}") int backupRetentionMin,
                           @Value("${drive.backup.dir:}") String driveDir,
                           @Value("${drive.every.ms:600000}") long driveEveryMs,
                           @Value("${drive.keep.copies:6}") int driveKeepCopies,
                           @Value("${backup.initial:true}") boolean backupInitial,
                           @Value("${restore.onstart:true}") boolean restoreOnStart) {
        this.counterService = counterService;
        this.tablesService = tablesService;
        this.mesaService = mesaService;
        this.sectorService = sectorService;
        this.backupDir = Paths.get(backupDir);
        this.backupEveryMs = backupEveryMs;
        this.backupRetentionMin = backupRetentionMin;
        this.driveDir = (driveDir == null || driveDir.isBlank()) ? null : Paths.get(driveDir);
        this.driveEveryMs = driveEveryMs;
        this.driveKeepCopies = driveKeepCopies;
        this.backupInitial = backupInitial;
        this.restoreOnStart = restoreOnStart;
    }

    public static class SnapshotData {
        public CounterState counter;
        public List<RegisterTable> registerTables;
        public List<FreeGameTable> freeGameTables;
        public Map<Integer, TotalesMesa> mesaTotals;
        public List<Event> mesaEvents;
        public Map<Integer, SectorService.MesaIndicators> sectorStates;
        public boolean qrEventEnabled;
        public boolean qrFreegameEnabled;
        public long ts;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void onReady() {
        ensureDir(backupDir);
        log.info("Snapshot config -> backup.dir={}, backup.every.ms={}, backup.retention.min={}, drive.dir={}, drive.every.ms={}, drive.keep.copies={}, backup.initial={}, restore.onstart={}",
                backupDir, backupEveryMs, backupRetentionMin, driveDir, driveEveryMs, driveKeepCopies, backupInitial, restoreOnStart);
        if (restoreOnStart) {
            restoreLatest();
        }
        // Trigger an initial snapshot to have a base file, but do it async to avoid blocking startup
        if (backupInitial) {
            Thread t = new Thread(() -> {
                try {
                    writeSnapshot();
                } catch (Exception e) {
                    log.warn("Initial snapshot failed: {}", e.getMessage());
                }
            }, "snapshot-initial-writer");
            t.setDaemon(true);
            t.start();
        }
    }

    @Scheduled(fixedDelayString = "${backup.every.ms:60000}")
    public void scheduledBackup() {
        try {
            writeSnapshot();
            pruneLocal();
        } catch (Exception e) {
            log.warn("Backup error: {}", e.getMessage());
        }
    }

    @Scheduled(fixedDelayString = "${drive.every.ms:600000}")
    public void scheduledDriveCopy() {
        if (driveDir == null) return;
        try {
            ensureDir(driveDir);
            Path latest = getLatestLocalSnapshot();
            if (latest == null) return;
            Path dest = driveDir.resolve(latest.getFileName());
            Files.copy(latest, dest, StandardCopyOption.REPLACE_EXISTING);
            pruneDrive();
        } catch (Exception e) {
            log.warn("Drive copy error: {}", e.getMessage());
        }
    }

    private void writeSnapshot() throws IOException {
        String ts = DateTimeFormatter.ofPattern("yyyyMMdd-HHmmss").withZone(ZoneId.systemDefault()).format(Instant.now());
        String file = "app-" + ts + ".json";
        Path out = backupDir.resolve(file);
        SnapshotData data = new SnapshotData();
        data.counter = counterService.getState();
        data.registerTables = tablesService.listRegister();
        data.freeGameTables = tablesService.listFreeGame();
        data.qrEventEnabled = tablesService.isEventQrEnabled();
        data.qrFreegameEnabled = tablesService.isFreegameQrEnabled();
        data.mesaTotals = mesaService.getTotalesSnapshot();
        data.mesaEvents = mesaService.getEventosSnapshot();
        data.sectorStates = sectorService.getSnapshot();
        data.ts = System.currentTimeMillis();
        objectMapper.writerWithDefaultPrettyPrinter().writeValue(out.toFile(), data);
        lastSnapshotPath = out;
    }

    // --- Public helpers for admin/ops use ---
    public synchronized Path createSnapshotNow() throws IOException {
        writeSnapshot();
        return lastSnapshotPath;
    }

    public Path getBackupDirPath() {
        return backupDir;
    }

    public Path getLatestSnapshotPathOrNull() {
        try {
            return getLatestLocalSnapshot();
        } catch (IOException e) {
            return null;
        }
    }

    private void restoreLatest() {
        try {
            Path latest = getLatestLocalSnapshot();
            if (latest == null) return;
            SnapshotData data = objectMapper.readValue(latest.toFile(), SnapshotData.class);
            applySnapshot(data);
        } catch (Exception e) {
            log.warn("Restore failed: {}", e.getMessage());
        }
    }

    private void applySnapshot(SnapshotData data) {
        if (data == null) return;
        if (data.counter != null) {
            counterService.setPrimary(Math.max(0, data.counter.primary()));
            counterService.setTertiary(Math.max(0, data.counter.tertiary()));
            Integer rawMax = data.counter.tertiaryMax();
            int normalizedMax = rawMax == null ? CounterService.TERTIARY_MAX_DEFAULT_VALUE : Math.max(0, rawMax);
            counterService.setTertiaryMax(normalizedMax);
        }
        mesaService.restore(data.mesaTotals, data.mesaEvents);
        sectorService.restore(data.sectorStates);
        tablesService.restore(data.registerTables, data.freeGameTables);
        tablesService.setEventQrEnabled(data.qrEventEnabled);
        tablesService.setFreegameQrEnabled(data.qrFreegameEnabled);
    }

    public synchronized boolean restoreFromFileName(String name) {
        try {
            if (name == null || name.isBlank()) return false;
            if (!name.startsWith("app-") || !name.endsWith(".json")) return false;
            Path file = backupDir.resolve(name).normalize();
            if (!file.startsWith(backupDir.normalize()) || !Files.exists(file)) return false;
            SnapshotData data = objectMapper.readValue(file.toFile(), SnapshotData.class);
            applySnapshot(data);
            lastSnapshotPath = file;
            return true;
        } catch (Exception e) {
            log.warn("Manual restore failed: {}", e.getMessage());
            return false;
        }
    }

    private Path getLatestLocalSnapshot() throws IOException {
        if (!Files.exists(backupDir)) return null;
        try (var s = Files.list(backupDir)) {
            List<Path> files = s.filter(p -> p.getFileName().toString().startsWith("app-") && p.getFileName().toString().endsWith(".json"))
                    .sorted(Comparator.comparingLong(this::safeMtime).reversed())
                    .collect(Collectors.toList());
            return files.isEmpty() ? null : files.get(0);
        }
    }

    private long safeMtime(Path p) {
        try {
            return Files.getLastModifiedTime(p).toMillis();
        } catch (IOException e) {
            return 0L;
        }
    }

    private void pruneLocal() throws IOException {
        long cutoff = System.currentTimeMillis() - (backupRetentionMin * 60L * 1000L);
        if (!Files.exists(backupDir)) return;
        try (var s = Files.list(backupDir)) {
            List<Path> files = s.filter(p -> p.getFileName().toString().startsWith("app-") && p.getFileName().toString().endsWith(".json"))
                    .sorted(Comparator.comparingLong(this::safeMtime).reversed())
                    .collect(Collectors.toList());
            for (Path p : files) {
                if (safeMtime(p) < cutoff) {
                    try { Files.deleteIfExists(p); } catch (Exception ignored) {}
                }
            }
        }
    }

    private void pruneDrive() throws IOException {
        if (driveDir == null || !Files.exists(driveDir)) return;
        try (var s = Files.list(driveDir)) {
            List<Path> files = s.filter(p -> p.getFileName().toString().startsWith("app-") && p.getFileName().toString().endsWith(".json"))
                    .sorted(Comparator.comparingLong(this::safeMtime).reversed())
                    .collect(Collectors.toList());
            for (int i = driveKeepCopies; i < files.size(); i++) {
                try { Files.deleteIfExists(files.get(i)); } catch (Exception ignored) {}
            }
        }
    }

    private void ensureDir(Path dir) {
        try {
            if (!Files.exists(dir)) Files.createDirectories(dir);
        } catch (Exception e) {
            log.warn("Cannot create dir {}: {}", dir, e.getMessage());
        }
    }
}
