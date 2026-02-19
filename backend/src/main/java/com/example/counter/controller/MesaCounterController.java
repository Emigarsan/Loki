package com.example.counter.controller;

import com.example.counter.service.mesa.MesaCounterService;
import com.example.counter.service.TablesService;
import com.example.counter.service.sector.SectorService;
import com.example.counter.service.model.RegisterTable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/mesas")
@CrossOrigin(origins = "*")
public class MesaCounterController {

    private final MesaCounterService mesaService;
    private final TablesService tablesService;
    private final SectorService sectorService;

    public MesaCounterController(MesaCounterService mesaService, TablesService tablesService, SectorService sectorService) {
        this.mesaService = mesaService;
        this.tablesService = tablesService;
        this.sectorService = sectorService;
    }

    @GetMapping("/summary")
    public ResponseEntity<Map<Integer, MesaCounterService.TotalesMesa>> summary() {
        Map<Integer, MesaCounterService.TotalesMesa> totales = mesaService.getTotalesSnapshot();
        
        // Enrich with table information and sector if services are available
        try {
            if (tablesService != null) {
                List<RegisterTable> tables = tablesService.listRegister();
                if (tables != null) {
                    for (RegisterTable table : tables) {
                        if (totales.containsKey(table.tableNumber())) {
                            MesaCounterService.TotalesMesa t = totales.get(table.tableNumber());
                            t.tableName = table.tableName();
                            t.realityName = table.realityName();
                        }
                    }
                }
            }
            
            // Enrich with sector information
            if (sectorService != null) {
                for (Map.Entry<Integer, MesaCounterService.TotalesMesa> entry : totales.entrySet()) {
                    int mesaId = entry.getKey();
                    MesaCounterService.TotalesMesa t = entry.getValue();
                    t.sectorId = sectorService.getSectorIdForMesa(mesaId);
                }
            }
        } catch (Exception e) {
            // Log error but don't fail the request
            System.err.println("Error enriching mesa summary: " + e.getMessage());
            e.printStackTrace();
        }
        
        return ResponseEntity.ok(totales);
    }

    @GetMapping("/events")
    public ResponseEntity<List<MesaCounterService.Event>> events() {
        return ResponseEntity.ok(mesaService.getEventosSnapshot());
    }

    @PostMapping("/{mesaId}/avatar-defeat")
    public ResponseEntity<Map<String, String>> recordAvatarDefeat(
            @PathVariable int mesaId,
            @RequestBody Map<String, Object> payload) {
        try {
            Integer avatarIndex = (Integer) payload.get("avatarIndex");
            Integer rupturaAmount = (Integer) payload.getOrDefault("rupturaAmount", 0);
            
            if (avatarIndex == null || avatarIndex < 0 || avatarIndex > 3) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "Invalid avatar index. Must be 0-3."));
            }
            
            mesaService.recordAvatarDefeat(mesaId, avatarIndex, rupturaAmount);
            return ResponseEntity.ok(Map.of("status", "ok", "message", "Avatar defeat recorded"));
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/{mesaId}/hero-defeat")
    public ResponseEntity<Map<String, String>> recordHeroDefeat(
            @PathVariable int mesaId,
            @RequestBody Map<String, Object> payload) {
        try {
            String heroName = (String) payload.get("heroName");
            Integer threatAmount = (Integer) payload.getOrDefault("threatAmount", 0);
            
            if (heroName == null || heroName.isBlank()) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "Hero name is required"));
            }
            
            mesaService.recordHeroDefeat(mesaId, heroName, threatAmount);
            return ResponseEntity.ok(Map.of("status", "ok", "message", "Hero defeat recorded"));
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/{mesaId}/plan-completion")
    public ResponseEntity<Map<String, String>> recordPlanCompletion(
            @PathVariable int mesaId,
            @RequestBody Map<String, Object> payload) {
        try {
            Integer threatAmount = (Integer) payload.getOrDefault("threatAmount", 0);
            
            mesaService.recordPlanCompletion(mesaId, threatAmount);
            return ResponseEntity.ok(Map.of("status", "ok", "message", "Plan completion recorded"));
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", e.getMessage()));
        }
    }}