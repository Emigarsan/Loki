package com.example.counter.controller;

import com.example.counter.service.TablesService;
import com.example.counter.service.mesa.MesaCounterService;
import com.example.counter.service.model.FreeGameTable;
import com.example.counter.service.model.RegisterTable;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.nio.charset.StandardCharsets;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.StringJoiner;

@RestController
@RequestMapping("/api/admin")
@CrossOrigin(origins = "*")
public class AdminController {
    private final TablesService tablesService;
    private final MesaCounterService mesaCounterService;
    private final String adminSecret;

    public AdminController(TablesService tablesService,
                           MesaCounterService mesaCounterService,
                           @Value("${admin.secret:}") String adminSecret) {
        this.tablesService = tablesService;
        this.mesaCounterService = mesaCounterService;
        this.adminSecret = adminSecret;
    }

    private boolean isAdmin(String secret) {
        return adminSecret != null && !adminSecret.isEmpty() && adminSecret.equals(secret);
    }

    @GetMapping("/tables")
    public ResponseEntity<?> listTables(@RequestHeader(value = "X-Admin-Secret", required = false) String secret) {
        if (!isAdmin(secret)) return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        return ResponseEntity.ok(Map.of(
                "register", tablesService.listRegister(),
                "freegame", tablesService.listFreeGame(),
                "qrFlags", buildQrFlags()
        ));
    }

    @GetMapping(value = "/export/event.csv", produces = "text/csv")
    public ResponseEntity<byte[]> exportEventCsv(@RequestHeader(value = "X-Admin-Secret", required = false) String secret) {
        if (!isAdmin(secret)) return new ResponseEntity<>(HttpStatus.FORBIDDEN);
        List<RegisterTable> reg = tablesService.listRegister();
        String csv = buildRegisterCsv(reg);
        return csvResponse(csv, "event.csv");
    }

    @GetMapping(value = "/export/freegame.csv", produces = "text/csv")
    public ResponseEntity<byte[]> exportFreeGameCsv(@RequestHeader(value = "X-Admin-Secret", required = false) String secret) {
        if (!isAdmin(secret)) return new ResponseEntity<>(HttpStatus.FORBIDDEN);
        List<FreeGameTable> free = tablesService.listFreeGame();
        String csv = buildFreeGameCsv(free);
        return csvResponse(csv, "freegame.csv");
    }

    @GetMapping(value = "/export/mesas_totales.csv", produces = "text/csv")
    public ResponseEntity<byte[]> exportMesaTotalesCsv(@RequestHeader(value = "X-Admin-Secret", required = false) String secret) {
        if (!isAdmin(secret)) return new ResponseEntity<>(HttpStatus.FORBIDDEN);
        Map<Integer, MesaCounterService.TotalesMesa> map = mesaCounterService.getTotalesSnapshot();
        StringJoiner sj = new StringJoiner("\n");
        sj.add("mesa,c1,c2,c3");
        map.entrySet().stream()
                .sorted((a,b) -> Integer.compare(a.getKey(), b.getKey()))
                .forEach(e -> {
                    var t = e.getValue();
                    sj.add(String.join(",",
                            String.valueOf(e.getKey()),
                            String.valueOf(t == null ? 0 : t.c1),
                            String.valueOf(t == null ? 0 : t.c2),
                            String.valueOf(t == null ? 0 : t.c3)
                    ));
                });
        String csv = sj.toString() + "\n";
        return csvResponse(csv, "mesas_totales.csv");
    }

    @GetMapping(value = "/export/freegame_scores.csv", produces = "text/csv")
    public ResponseEntity<byte[]> exportFreeGameScoresCsv(@RequestHeader(value = "X-Admin-Secret", required = false) String secret) {
        if (!isAdmin(secret)) return new ResponseEntity<>(HttpStatus.FORBIDDEN);
        List<FreeGameTable> free = tablesService.listFreeGame();
        StringJoiner sj = new StringJoiner("\n");
        sj.add("tableNumber,difficulty,inevitableChallenge,base,legados,victoryPoints,total,scenarioCleared");
        for (FreeGameTable t : free) {
            boolean noCh = t.inevitableChallenge() == null || t.inevitableChallenge().isBlank() || "(Ninguno)".equals(t.inevitableChallenge());
            int base = noCh ? 0 : ("Experto".equalsIgnoreCase(t.difficulty()) ? 5 : 3);
            int legacyCount = 0;
            if (!noCh && t.playersInfo() != null) {
                for (var p : t.playersInfo()) {
                    if (p != null) {
                        String lg = p.legacy();
                        if (lg != null && !lg.isBlank() && !"Ninguno".equalsIgnoreCase(lg)) legacyCount++;
                    }
                }
            }
            boolean scenarioCleared = t.scenarioCleared();
            int vp = (noCh || !scenarioCleared) ? 0 : Math.max(0, t.victoryPoints());
            int total = (noCh || !scenarioCleared) ? 0 : (base + legacyCount + vp);
            sj.add(String.join(",",
                    String.valueOf(t.tableNumber()),
                    escape(nullToEmpty(t.difficulty())),
                    escape(nullToEmpty(t.inevitableChallenge())),
                    String.valueOf(base),
                    String.valueOf(legacyCount),
                    String.valueOf(vp),
                    String.valueOf(total),
                    String.valueOf(scenarioCleared)
            ));
        }
        String csv = sj.toString() + "\n";
        return csvResponse(csv, "freegame_scores.csv");
    }

    @GetMapping("/qr")
    public ResponseEntity<Map<String, Boolean>> getQrFlags(@RequestHeader(value = "X-Admin-Secret", required = false) String secret) {
        if (!isAdmin(secret)) return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        return ResponseEntity.ok(buildQrFlags());
    }

    @PostMapping("/qr/event")
    public ResponseEntity<Map<String, Boolean>> setEventQrFlag(@RequestHeader(value = "X-Admin-Secret", required = false) String secret,
                                                               @RequestBody Map<String, Object> payload) {
        if (!isAdmin(secret)) return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        tablesService.setEventQrEnabled(parseEnabled(payload));
        return ResponseEntity.ok(buildQrFlags());
    }

    @PostMapping("/qr/freegame")
    public ResponseEntity<Map<String, Boolean>> setFreegameQrFlag(@RequestHeader(value = "X-Admin-Secret", required = false) String secret,
                                                                  @RequestBody Map<String, Object> payload) {
        if (!isAdmin(secret)) return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        tablesService.setFreegameQrEnabled(parseEnabled(payload));
        return ResponseEntity.ok(buildQrFlags());
    }

    private String buildRegisterCsv(List<RegisterTable> reg) {
        StringJoiner sj = new StringJoiner("\n");
        // One row per player; repeat table info
        sj.add("id,tableNumber,tableName,difficulty,players,code,createdAt,playerIndex,character,aspect");
        DateTimeFormatter fmt = DateTimeFormatter.ISO_INSTANT;
        for (RegisterTable t : reg) {
            List<com.example.counter.service.model.PlayerInfo> list = t.playersInfo();
            if (list == null || list.isEmpty()) {
                sj.add(String.join(",",
                        escape(t.id()),
                        String.valueOf(t.tableNumber()),
                        escape(t.tableName()),
                        escape(t.difficulty()),
                        String.valueOf(t.players()),
                        escape(t.code()),
                        escape(fmt.format(t.createdAt())),
                        "",
                        "",
                        ""
                ));
                continue;
            }
            for (int i = 0; i < list.size(); i++) {
                var pi = list.get(i);
                sj.add(String.join(",",
                        escape(t.id()),
                        String.valueOf(t.tableNumber()),
                        escape(t.tableName()),
                        escape(t.difficulty()),
                        String.valueOf(t.players()),
                        escape(t.code()),
                        escape(fmt.format(t.createdAt())),
                        String.valueOf(i + 1),
                        escape(pi.character()),
                        escape(pi.aspect())
                ));
            }
        }
        return sj.toString() + "\n";
    }

    private String buildFreeGameCsv(List<FreeGameTable> free) {
        StringJoiner sj = new StringJoiner("\n");
        // One row per player; repeat table info
        sj.add("id,tableNumber,name,players,code,createdAt,scenarioCleared,playerIndex,character,aspect,legacy");
        DateTimeFormatter fmt = DateTimeFormatter.ISO_INSTANT;
        for (FreeGameTable t : free) {
            var list = t.playersInfo();
            if (list == null || list.isEmpty()) {
                sj.add(String.join(",",
                        escape(t.id()),
                        String.valueOf(t.tableNumber()),
                        escape(t.name()),
                        String.valueOf(t.players()),
                        escape(t.code()),
                        escape(fmt.format(t.createdAt())),
                        String.valueOf(t.scenarioCleared()),
                        "",
                        "",
                        "",
                        ""
                ));
                continue;
            }
            for (int i = 0; i < list.size(); i++) {
                var pi = list.get(i);
                sj.add(String.join(",",
                        escape(t.id()),
                        String.valueOf(t.tableNumber()),
                        escape(t.name()),
                        String.valueOf(t.players()),
                        escape(t.code()),
                        escape(fmt.format(t.createdAt())),
                        String.valueOf(t.scenarioCleared()),
                        String.valueOf(i + 1),
                        escape(pi.character()),
                        escape(pi.aspect()),
                        escape(pi.legacy())
                ));
            }
        }
        return sj.toString() + "\n";
    }

    private Map<String, Boolean> buildQrFlags() {
        return Map.of(
                "event", tablesService.isEventQrEnabled(),
                "freegame", tablesService.isFreegameQrEnabled()
        );
    }

    private boolean parseEnabled(Map<String, Object> payload) {
        Object raw = payload == null ? null : payload.get("enabled");
        if (raw instanceof Boolean b) {
            return b;
        }
        if (raw instanceof String s) {
            return Boolean.parseBoolean(s);
        }
        if (raw instanceof Number n) {
            return n.intValue() != 0;
        }
        return false;
    }

    private String escape(String v) {
        if (v == null) return "";
        boolean needsQuote = v.contains(",") || v.contains("\n") || v.contains("\"");
        String out = v.replace("\"", "\"\"");
        return needsQuote ? ("\"" + out + "\"") : out;
    }

    private String nullToEmpty(String v) {
        return v == null ? "" : v;
    }

    private ResponseEntity<byte[]> csvResponse(String csv, String filename) {
        byte[] bytes = csv.getBytes(StandardCharsets.UTF_8);
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.valueOf("text/csv"));
        headers.set(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\""+filename+"\"");
        return new ResponseEntity<>(bytes, headers, HttpStatus.OK);
    }
}
