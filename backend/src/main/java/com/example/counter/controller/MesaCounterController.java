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
}

