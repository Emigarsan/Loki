package com.example.counter.controller;

import com.example.counter.service.mesa.MesaCounterService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/mesas")
@CrossOrigin(origins = "*")
public class MesaCounterController {

    private final MesaCounterService mesaService;

    public MesaCounterController(MesaCounterService mesaService) {
        this.mesaService = mesaService;
    }

    @GetMapping("/summary")
    public ResponseEntity<Map<Integer, MesaCounterService.TotalesMesa>> summary() {
        return ResponseEntity.ok(mesaService.getTotalesSnapshot());
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