package com.example.counter.controller;

import com.example.counter.service.CounterService;
import com.example.counter.service.model.CounterState;
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

    public CounterController(CounterService counterService) {
        this.counterService = counterService;
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

    private int sanitizeAmount(Map<String, Integer> payload) {
        return Math.max(0, payload.getOrDefault("amount", 1));
    public ResponseEntity<Map<String, Integer>> getCurrentValue() {
        return ResponseEntity.ok(Map.of("value", counterService.getCurrentValue()));
    }

    @PostMapping("/increment")
    public ResponseEntity<Map<String, Integer>> increment(@RequestBody Map<String, Integer> payload) {
        int amount = payload.getOrDefault("amount", 1);
        return ResponseEntity.ok(Map.of("value", counterService.increment(amount)));
    }

    @PostMapping("/decrement")
    public ResponseEntity<Map<String, Integer>> decrement(@RequestBody Map<String, Integer> payload) {
        int amount = payload.getOrDefault("amount", 1);
        return ResponseEntity.ok(Map.of("value", counterService.decrement(amount)));
    }
}
