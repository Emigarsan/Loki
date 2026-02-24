package com.example.counter.service.sector;

import com.example.counter.service.TablesService;
import com.example.counter.service.mesa.MesaCounterService;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class SectorService {
    public static final int MESA_GROUP_START = 9;
    public static final int MESA_GROUP_SIZE = 3;

    public static class IndicatorState {
        public String key;
        public Integer activeMesaId;
        public int value;
        public boolean defeated;

        public IndicatorState() {
        }

        public IndicatorState(String key) {
            this.key = key;
        }
    }

    public static class MesaIndicators {
        public int mesaId;
        public IndicatorState mangog = new IndicatorState("mangog");
        public IndicatorState gate = new IndicatorState("gate");
    }

    public static class SectorStatus {
        public int sectorId;
        public List<Integer> mesas;
        public Map<Integer, Map<String, IndicatorState>> indicatorsByMesa;
    }

    private final Map<Integer, MesaIndicators> mesaIndicators = new HashMap<>();
    private final TablesService tablesService;
    private final MesaCounterService mesaCounterService;

    public SectorService(TablesService tablesService, MesaCounterService mesaCounterService) {
        this.tablesService = tablesService;
        this.mesaCounterService = mesaCounterService;
    }

    public synchronized SectorStatus getStatusForMesa(int mesaId) {
        SectorInfo info = resolveSector(mesaId);
        mesaIndicators.computeIfAbsent(mesaId, id -> {
            MesaIndicators m = new MesaIndicators();
            m.mesaId = id;
            return m;
        });
        boolean viewerDisconnected = isMesaDisconnected(mesaId);
        return buildStatus(info.sectorId, info.mesas, mesaId, viewerDisconnected);
    }

    public synchronized SectorStatus setIndicatorActive(int mesaId, String indicatorKey, boolean active) {
        if (isMesaDisconnected(mesaId)) {
            return getStatusForMesa(mesaId);
        }
        SectorInfo info = resolveSector(mesaId);
        MesaIndicators indicators = mesaIndicators.computeIfAbsent(mesaId, id -> {
            MesaIndicators m = new MesaIndicators();
            m.mesaId = id;
            return m;
        });
        IndicatorState indicator = getIndicator(indicators, indicatorKey);
        if (indicator == null) {
            return null;
        }
        if (indicator.defeated) {
            throw new IllegalStateException("indicator defeated");
        }
        if (active) {
            if (indicator.activeMesaId != null && indicator.activeMesaId != mesaId) {
                throw new IllegalStateException("indicator already active in another mesa");
            }
            int activeMesasInSector = countActiveTablesInSector(info.sectorId);
            int initialValue;
            if ("mangog".equalsIgnoreCase(indicatorKey)) {
                initialValue = 10 * activeMesasInSector;
            } else if ("gate".equalsIgnoreCase(indicatorKey)) {
                initialValue = 7 * activeMesasInSector;
            } else {
                initialValue = 0;
            }
            indicator.activeMesaId = mesaId;
            indicator.value = initialValue;
        } else {
            if (indicator.activeMesaId != mesaId) {
                throw new IllegalStateException("only activated mesa can deactivate");
            }
            indicator.activeMesaId = null;
        }
        return buildStatus(info.sectorId, info.mesas, mesaId, false);
    }

    public synchronized SectorStatus applyDelta(int mesaId, int targetMesaId, String indicatorKey, int delta) {
        boolean sourceDisconnected = isMesaDisconnected(mesaId);
        boolean targetDisconnected = isMesaDisconnected(targetMesaId);
        if (sourceDisconnected || targetDisconnected) {
            return getStatusForMesa(mesaId);
        }
        SectorInfo sourceInfo = resolveSector(mesaId);
        SectorInfo targetInfo = resolveSector(targetMesaId);

        // Verify both mesas are in the same sector
        if (sourceInfo.sectorId != targetInfo.sectorId) {
            throw new IllegalStateException("mesas not in same sector");
        }

        MesaIndicators targetIndicators = mesaIndicators.computeIfAbsent(targetMesaId, id -> {
            MesaIndicators m = new MesaIndicators();
            m.mesaId = id;
            return m;
        });
        IndicatorState indicator = getIndicator(targetIndicators, indicatorKey);
        if (indicator == null) {
            return null;
        }
        if (indicator.defeated) {
            throw new IllegalStateException("indicator defeated");
        }
        if (indicator.activeMesaId == null) {
            throw new IllegalStateException("indicator not active");
        }
        int next = indicator.value + delta;
        if (next < 0) {
            next = 0;
        }
        if (indicator.value > 0 && next == 0 && delta < 0) {
            indicator.defeated = true;
            String defeatedAvatarName = toSpecialAvatarName(indicatorKey);
            if (defeatedAvatarName != null) {
                mesaCounterService.recordNamedAvatarDefeat(targetMesaId, defeatedAvatarName, 0);
            }
        }
        indicator.value = next;
        return buildStatus(targetInfo.sectorId, targetInfo.mesas, mesaId, false);
    }

    private String toSpecialAvatarName(String indicatorKey) {
        if ("mangog".equalsIgnoreCase(indicatorKey)) {
            return "Mangog";
        }
        if ("gate".equalsIgnoreCase(indicatorKey)) {
            return "Portal entre dos mundos";
        }
        return null;
    }

    public int getSectorIdForMesa(int mesaId) {
        SectorInfo info = resolveSector(mesaId);
        return info.sectorId;
    }

    public synchronized Map<Integer, MesaIndicators> getSnapshot() {
        Map<Integer, MesaIndicators> copy = new HashMap<>();
        for (var entry : mesaIndicators.entrySet()) {
            MesaIndicators src = entry.getValue();
            MesaIndicators dst = new MesaIndicators();
            dst.mesaId = src.mesaId;
            dst.mangog = copyIndicator(src.mangog);
            dst.gate = copyIndicator(src.gate);
            copy.put(entry.getKey(), dst);
        }
        return copy;
    }

    public synchronized void restore(Map<Integer, MesaIndicators> snapshot) {
        mesaIndicators.clear();
        if (snapshot == null) {
            return;
        }
        for (var entry : snapshot.entrySet()) {
            MesaIndicators src = entry.getValue();
            if (src == null) {
                continue;
            }
            MesaIndicators dst = new MesaIndicators();
            dst.mesaId = src.mesaId;
            dst.mangog = copyIndicator(src.mangog);
            dst.gate = copyIndicator(src.gate);
            mesaIndicators.put(entry.getKey(), dst);
        }
    }

    private IndicatorState copyIndicator(IndicatorState src) {
        IndicatorState dst = new IndicatorState(src == null ? null : src.key);
        if (src != null) {
            dst.activeMesaId = src.activeMesaId;
            dst.value = src.value;
            dst.defeated = src.defeated;
        }
        return dst;
    }

    private IndicatorState getIndicator(MesaIndicators indicators, String key) {
        if ("mangog".equalsIgnoreCase(key)) {
            return indicators.mangog;
        }
        if ("gate".equalsIgnoreCase(key)) {
            return indicators.gate;
        }
        return null;
    }

    private SectorStatus buildStatus(int sectorId, List<Integer> theoreticalMesas, int viewerMesaId,
            boolean viewerDisconnected) {
        SectorStatus status = new SectorStatus();
        status.sectorId = sectorId;

        // Filter to only include registered mesas
        List<Integer> registeredMesas = new ArrayList<>();
        for (int mesaId : theoreticalMesas) {
            if (isMesaRegistered(mesaId)) {
                registeredMesas.add(mesaId);
            }
        }

        List<Integer> visibleMesas = new ArrayList<>();
        for (int mesaId : registeredMesas) {
            if (viewerDisconnected) {
                if (mesaId == viewerMesaId) {
                    visibleMesas.add(mesaId);
                }
            } else if (!isMesaDisconnected(mesaId)) {
                visibleMesas.add(mesaId);
            }
        }

        status.mesas = visibleMesas;
        status.indicatorsByMesa = new HashMap<>();

        for (int mesaId : visibleMesas) {
            MesaIndicators mesaInd = mesaIndicators.get(mesaId);
            if (mesaInd == null) {
                mesaInd = new MesaIndicators();
                mesaInd.mesaId = mesaId;
            }
            Map<String, IndicatorState> indMap = new HashMap<>();
            indMap.put("mangog", copyIndicator(mesaInd.mangog));
            indMap.put("gate", copyIndicator(mesaInd.gate));
            status.indicatorsByMesa.put(mesaId, indMap);
        }

        return status;
    }

    private boolean isMesaRegistered(int mesaId) {
        return tablesService.listRegister().stream()
                .anyMatch(table -> table.tableNumber() == mesaId);
    }

    private int countActiveTablesInSector(int sectorId) {
        SectorInfo info = null;
        if (sectorId == 1) {
            info = new SectorInfo(1, range(1, 4));
        } else if (sectorId == 2) {
            info = new SectorInfo(2, range(5, 8));
        } else {
            int group = sectorId - 3;
            int start = MESA_GROUP_START + (group * MESA_GROUP_SIZE);
            int end = start + (MESA_GROUP_SIZE - 1);
            info = new SectorInfo(sectorId, range(start, end));
        }

        List<Integer> mesasInSector = info.mesas;
        return (int) tablesService.listRegister().stream()
                .filter(table -> mesasInSector.contains(table.tableNumber()))
                .filter(table -> !table.disconnected())
                .count();
    }

    private boolean isMesaDisconnected(int mesaId) {
        return tablesService.isRegisterTableDisconnected(mesaId);
    }

    private SectorInfo resolveSector(int mesaId) {
        int safeMesaId = Math.max(1, mesaId);
        if (safeMesaId <= 4) {
            return new SectorInfo(1, range(1, 4));
        }
        if (safeMesaId <= 8) {
            return new SectorInfo(2, range(5, 8));
        }
        int offset = safeMesaId - MESA_GROUP_START;
        int group = Math.max(0, offset / MESA_GROUP_SIZE);
        int sectorId = 3 + group;
        int start = MESA_GROUP_START + (group * MESA_GROUP_SIZE);
        int end = start + (MESA_GROUP_SIZE - 1);
        return new SectorInfo(sectorId, range(start, end));
    }

    private List<Integer> range(int start, int end) {
        List<Integer> list = new ArrayList<>();
        for (int i = start; i <= end; i++) {
            list.add(i);
        }
        return list;
    }

    private static class SectorInfo {
        public final int sectorId;
        public final List<Integer> mesas;

        private SectorInfo(int sectorId, List<Integer> mesas) {
            this.sectorId = sectorId;
            this.mesas = mesas;
        }
    }
}
