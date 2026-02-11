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

import java.util.Map;

@RestController
@RequestMapping("/api/sector")
@CrossOrigin(origins = "*")
public class SectorController {

    private final SectorService sectorService;

    public SectorController(SectorService sectorService) {
        this.sectorService = sectorService;
    }

    @GetMapping("/{mesaId}")
    public ResponseEntity<SectorStatus> getSector(@PathVariable("mesaId") int mesaId) {
        return ResponseEntity.ok(sectorService.getStatusForMesa(mesaId));
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
