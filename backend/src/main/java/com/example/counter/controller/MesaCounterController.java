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

    @PostMapping("/avatar-defeated")
    public ResponseEntity<MesaCounterService.TotalesMesa> recordAvatarDefeated(
            @RequestBody Map<String, Object> payload) {
        int mesaId = ((Number) payload.getOrDefault("mesaId", 0)).intValue();
        int avatarIndex = ((Number) payload.getOrDefault("avatarIndex", -1)).intValue();
        int ruptura = ((Number) payload.getOrDefault("ruptura", 0)).intValue();
        var updated = mesaService.recordAvatarDefeat(mesaId, avatarIndex, Math.max(0, ruptura));
        return ResponseEntity.ok(updated);
    }

    @PostMapping("/threat-added")
    public ResponseEntity<MesaCounterService.TotalesMesa> addThreat(
            @RequestBody Map<String, Object> payload) {
        int mesaId = ((Number) payload.getOrDefault("mesaId", 0)).intValue();
        int delta = ((Number) payload.getOrDefault("delta", 1)).intValue();
        String source = String.valueOf(payload.getOrDefault("source", ""));
        var updated = mesaService.addThreat(mesaId, Math.max(0, delta), source);
        return ResponseEntity.ok(updated);
    }
}

