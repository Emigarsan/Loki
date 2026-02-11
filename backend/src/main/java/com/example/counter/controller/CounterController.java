package com.example.counter.controller;

import com.example.counter.service.CounterService;
import com.example.counter.service.model.CounterState;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/counter")
@CrossOrigin(origins = "*")
public class CounterController {

    private final CounterService counterService;
    private final String adminSecret;

    public CounterController(CounterService counterService,
                             @Value("${admin.secret:}") String adminSecret) {
        this.counterService = counterService;
        this.adminSecret = adminSecret;
    }

    @GetMapping
    public ResponseEntity<CounterState> getCurrentState() {
        return ResponseEntity.ok(counterService.getState());
    }

    @PostMapping("/primary/increment")
    public ResponseEntity<CounterState> incrementPrimary(@RequestBody Map<String, Integer> payload) {
        int amount = sanitizeAmount(payload);
        return ResponseEntity.ok(counterService.incrementPrimary(amount));
    }

    @PostMapping("/primary/decrement")
    public ResponseEntity<CounterState> decrementPrimary(@RequestBody Map<String, Integer> payload) {
        int amount = sanitizeAmount(payload);
        return ResponseEntity.ok(counterService.decrementPrimary(amount));
    }

    @PostMapping("/secondary/increment")
    public ResponseEntity<CounterState> incrementSecondary(@RequestBody Map<String, Integer> payload) {
        int amount = sanitizeAmount(payload);
        return ResponseEntity.ok(counterService.incrementSecondary(amount));
    }

    @PostMapping("/secondary/decrement")
    public ResponseEntity<CounterState> decrementSecondary(@RequestBody Map<String, Integer> payload) {
        int amount = sanitizeAmount(payload);
        return ResponseEntity.ok(counterService.decrementSecondary(amount));
    }

    @PostMapping("/tertiary/increment")
    public ResponseEntity<CounterState> incrementTertiary(@RequestBody Map<String, Integer> payload) {
        int amount = sanitizeAmount(payload);
        return ResponseEntity.ok(counterService.incrementTertiary(amount));
    }

    @PostMapping("/tertiary/decrement")
    public ResponseEntity<CounterState> decrementTertiary(@RequestBody Map<String, Integer> payload) {
        int amount = sanitizeAmount(payload);
        return ResponseEntity.ok(counterService.decrementTertiary(amount));
    }

    // --- Exact setters for Admin ---
    @PostMapping("/primary/set")
    public ResponseEntity<CounterState> setPrimary(@RequestBody Map<String, Integer> payload,
                                                   @org.springframework.web.bind.annotation.RequestHeader(value = "X-Admin-Secret", required = false) String secret) {
        if (!isAdmin(secret)) return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        int value = sanitizeValue(payload);
        return ResponseEntity.ok(counterService.setPrimary(value));
    }

    @PostMapping("/secondary/set")
    public ResponseEntity<CounterState> setSecondary(@RequestBody Map<String, Integer> payload,
                                                     @org.springframework.web.bind.annotation.RequestHeader(value = "X-Admin-Secret", required = false) String secret) {
        if (!isAdmin(secret)) return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        int value = sanitizeValue(payload);
        return ResponseEntity.ok(counterService.setSecondary(value));
    }

    @PostMapping("/tertiary/set")
    public ResponseEntity<CounterState> setTertiary(@RequestBody Map<String, Integer> payload,
                                                    @org.springframework.web.bind.annotation.RequestHeader(value = "X-Admin-Secret", required = false) String secret) {
        if (!isAdmin(secret)) return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        int value = sanitizeValue(payload);
        return ResponseEntity.ok(counterService.setTertiary(value));
    }

    @PostMapping("/tertiary/max/set")
    public ResponseEntity<CounterState> setTertiaryMax(@RequestBody Map<String, Integer> payload,
                                                       @org.springframework.web.bind.annotation.RequestHeader(value = "X-Admin-Secret", required = false) String secret) {
        if (!isAdmin(secret)) return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        int value = sanitizeValue(payload);
        return ResponseEntity.ok(counterService.setTertiaryMax(value));
    }

    @PostMapping("/secondary/imageIndex")
    public ResponseEntity<CounterState> setSecondaryImageIndex(@RequestBody Map<String, Integer> payload,
                                                              @org.springframework.web.bind.annotation.RequestHeader(value = "X-Admin-Secret", required = false) String secret) {
        if (!isAdmin(secret)) return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        int index = payload.getOrDefault("index", 0);
        return ResponseEntity.ok(counterService.setSecondaryImageIndex(index));
    }

    private int sanitizeAmount(Map<String, Integer> payload) {
        return Math.max(0, payload.getOrDefault("amount", 1));
    }

    private int sanitizeValue(Map<String, Integer> payload) {
        return Math.max(0, payload.getOrDefault("value", 0));
    }

    private boolean isAdmin(String secret) {
        return adminSecret != null && !adminSecret.isEmpty() && adminSecret.equals(secret);
    }
}
