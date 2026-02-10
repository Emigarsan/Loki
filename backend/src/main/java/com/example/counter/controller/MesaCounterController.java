package com.example.counter.controller;

import com.example.counter.service.mesa.MesaCounterService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/mesas")
@CrossOrigin(origins = "*")
public class MesaCounterController {

    private final MesaCounterService mesaService;

    public MesaCounterController(MesaCounterService mesaService) {
        this.mesaService = mesaService;
    }

    @PostMapping("/{mesaId}/contador/{contador}")
    public ResponseEntity<Map<String, Object>> addEvent(@PathVariable("mesaId") int mesaId,
                                                        @PathVariable("contador") int contador,
                                                        @RequestBody Map<String, Object> payload) {
        int delta = ((Number) payload.getOrDefault("delta", 0)).intValue();
        String uuid = String.valueOf(payload.getOrDefault("uuid", UUID.randomUUID().toString()));
        Long ts = null;
        Object tsObj = payload.get("ts");
        if (tsObj instanceof Number n) ts = n.longValue();

        boolean ok = mesaService.applyEvent(uuid, mesaId, contador, delta, ts);
        if (!ok) return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("ok", false));
        return ResponseEntity.ok(Map.of("ok", true));
    }

    @GetMapping("/summary")
    public ResponseEntity<Map<Integer, MesaCounterService.TotalesMesa>> summary() {
        return ResponseEntity.ok(mesaService.getTotalesSnapshot());
    }

    @GetMapping("/events")
    public ResponseEntity<List<MesaCounterService.Event>> events() {
        return ResponseEntity.ok(mesaService.getEventosSnapshot());
    }
}

