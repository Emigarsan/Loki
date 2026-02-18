package com.example.counter.controller;

import com.example.counter.service.sector.SectorService;
import com.example.counter.service.sector.SectorService.SectorStatus;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.counter.service.TablesService;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/sector")
@CrossOrigin(origins = "*")
public class SectorController {

    private final SectorService sectorService;
    private final TablesService tablesService;

    public SectorController(SectorService sectorService, TablesService tablesService) {
        this.sectorService = sectorService;
        this.tablesService = tablesService;
    }

    @GetMapping("/{mesaId}")
    public ResponseEntity<SectorStatus> getSector(@PathVariable("mesaId") int mesaId) {
        return ResponseEntity.ok(sectorService.getStatusForMesa(mesaId));
    }

    @GetMapping("/indicators/summary")
    public ResponseEntity<Map<String, Object>> getIndicatorsSummary() {
        Map<String, Object> summary = new HashMap<>();
        try {
            Map<String, Map<String, Object>> sectorStats = new HashMap<>();
            
            // Only process registered mesas
            for (var table : tablesService.listRegister()) {
                int mesaId = table.tableNumber();
                try {
                    SectorStatus status = sectorService.getStatusForMesa(mesaId);
                    if (status == null || status.mesas == null || status.mesas.isEmpty()) {
                        continue;
                    }
                    
                    String sectorName = getSectorName(status.sectorId);
                    
                    if (!sectorStats.containsKey(sectorName)) {
                        Map<String, Object> sectorInfo = new HashMap<>();
                        sectorInfo.put("mangog_defeated", 0);
                        sectorInfo.put("gate_defeated", 0);
                        sectorInfo.put("total_mesas", 0);
                        sectorInfo.put("mesas", new HashMap<>());
                        sectorStats.put(sectorName, sectorInfo);
                    }
                    
                    Map<String, Object> stats = sectorStats.get(sectorName);
                    stats.put("total_mesas", (int) stats.get("total_mesas") + 1);
                    
                    Map<Integer, Map<String, Object>> mesas = (Map<Integer, Map<String, Object>>) stats.get("mesas");
                    Map<String, Object> mesaInfo = new HashMap<>();
                    mesaInfo.put("mangog_defeated", false);
                    mesaInfo.put("gate_defeated", false);
                    
                    // Access indicatorsByMesa with Integer key and correct type
                    if (status.indicatorsByMesa != null && status.indicatorsByMesa.containsKey(mesaId)) {
                        Map<String, SectorService.IndicatorState> indicators = status.indicatorsByMesa.get(mesaId);
                        if (indicators != null) {
                            SectorService.IndicatorState mangog = indicators.get("mangog");
                            if (isDefeated(mangog)) {
                                mesaInfo.put("mangog_defeated", true);
                                stats.put("mangog_defeated", (int) stats.get("mangog_defeated") + 1);
                            }
                            
                            SectorService.IndicatorState gate = indicators.get("gate");
                            if (isDefeated(gate)) {
                                mesaInfo.put("gate_defeated", true);
                                stats.put("gate_defeated", (int) stats.get("gate_defeated") + 1);
                            }
                        }
                    }
                    
                    mesas.put(mesaId, mesaInfo);
                } catch (Exception e) {
                    // Continue with next mesa
                }
            }
            
            summary.put("by_sector", sectorStats);
            return ResponseEntity.ok(summary);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    private String getSectorName(int sectorId) {
        if (sectorId == 1) {
            return "Sector 1";
        } else if (sectorId == 2) {
            return "Sector 2";
        } else {
            return "Sector " + sectorId;
        }
    }

    private boolean isDefeated(SectorService.IndicatorState indicator) {
        return indicator != null && indicator.defeated;
    }

    @PostMapping("/{mesaId}/indicator/{indicator}/active")
    public ResponseEntity<?> setIndicatorActive(@PathVariable("mesaId") int mesaId,
                                                @PathVariable("indicator") String indicator,
                                                @RequestBody Map<String, Object> payload) {
        boolean active = Boolean.TRUE.equals(payload.get("active"));
        try {
            return ResponseEntity.ok(sectorService.setIndicatorActive(mesaId, indicator, active));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/{mesaId}/indicator/{indicator}/delta")
    public ResponseEntity<?> applyDelta(@PathVariable("mesaId") int mesaId,
                                        @PathVariable("indicator") String indicator,
                                        @RequestBody Map<String, Object> payload) {
        int targetMesaId = ((Number) payload.getOrDefault("targetMesaId", mesaId)).intValue();
        int delta = ((Number) payload.getOrDefault("delta", 0)).intValue();
        try {
            return ResponseEntity.ok(sectorService.applyDelta(mesaId, targetMesaId, indicator, delta));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("error", e.getMessage()));
        }
    }
}
