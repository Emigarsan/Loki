package com.example.counter.controller;

import com.example.counter.service.CounterService;
import com.example.counter.service.TablesService;
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
    private final TablesService tablesService;
    private final String adminSecret;

    public CounterController(CounterService counterService,
            TablesService tablesService,
            @Value("${admin.secret:}") String adminSecret) {
        this.counterService = counterService;
        this.tablesService = tablesService;
        this.adminSecret = adminSecret;
    }

    @GetMapping
    public ResponseEntity<CounterState> getCurrentState() {
        CounterState current = counterService.getState();
        int currentPrimaryMax = current.primaryMax == null ? 0 : current.primaryMax;
        if (current.primary == 4000 && currentPrimaryMax == 4000) {
            int recommended = getRecommendedPrimaryMax();
            if (recommended > 0 && recommended != 4000) {
                return ResponseEntity.ok(counterService.setPrimaryMaxAndCurrent(recommended));
            }
        }
        return ResponseEntity.ok(current);
    }

    // --- Exact setters for Admin ---
    @PostMapping("/primary/set")
    public ResponseEntity<CounterState> setPrimary(@RequestBody Map<String, Integer> payload,
            @org.springframework.web.bind.annotation.RequestHeader(value = "X-Admin-Secret", required = false) String secret) {
        if (!isAdmin(secret))
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        int value = sanitizeValue(payload);
        return ResponseEntity.ok(counterService.setPrimary(value));
    }

    @PostMapping("/primary/max/set")
    public ResponseEntity<CounterState> setPrimaryMax(@RequestBody Map<String, Object> payload,
            @org.springframework.web.bind.annotation.RequestHeader(value = "X-Admin-Secret", required = false) String secret) {
        if (!isAdmin(secret))
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        int value = sanitizeObjectValue(payload, "value");
        boolean syncCurrent = parseBoolean(payload == null ? null : payload.get("syncCurrent"), true);
        return ResponseEntity.ok(syncCurrent
                ? counterService.setPrimaryMaxAndCurrent(value)
                : counterService.setPrimaryMax(value));
    }

    @PostMapping("/tertiary/set")
    public ResponseEntity<CounterState> setTertiary(@RequestBody Map<String, Integer> payload,
            @org.springframework.web.bind.annotation.RequestHeader(value = "X-Admin-Secret", required = false) String secret) {
        if (!isAdmin(secret))
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        int value = sanitizeValue(payload);
        return ResponseEntity.ok(counterService.setTertiary(value));
    }

    @PostMapping("/tertiary/max/set")
    public ResponseEntity<CounterState> setTertiaryMax(@RequestBody Map<String, Integer> payload,
            @org.springframework.web.bind.annotation.RequestHeader(value = "X-Admin-Secret", required = false) String secret) {
        if (!isAdmin(secret))
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        int value = sanitizeValue(payload);
        return ResponseEntity.ok(counterService.setTertiaryMax(value));
    }

    @PostMapping("/primary/reduce")
    public ResponseEntity<CounterState> reducePrimary(@RequestBody Map<String, Integer> payload) {
        int delta = Math.max(0, payload.getOrDefault("delta", 0));
        Integer mesaId = payload.get("mesaId");
        if (!shouldApplyForMesa(mesaId)) {
            return ResponseEntity.ok(counterService.getState());
        }
        return ResponseEntity.ok(counterService.reducePrimary(delta));
    }

    @PostMapping("/tertiary/increment")
    public ResponseEntity<CounterState> incrementTertiary(@RequestBody Map<String, Integer> payload) {
        int delta = Math.max(0, payload.getOrDefault("delta", 0));
        Integer mesaId = payload.get("mesaId");
        if (!shouldApplyForMesa(mesaId)) {
            return ResponseEntity.ok(counterService.getState());
        }
        return ResponseEntity.ok(counterService.incrementTertiary(delta));
    }

    private boolean shouldApplyForMesa(Integer mesaId) {
        return mesaId == null || !tablesService.isRegisterTableDisconnected(mesaId);
    }

    private int getRecommendedPrimaryMax() {
        if (tablesService == null || tablesService.listRegister() == null) {
            return 0;
        }
        int totalPlayers = tablesService.listRegister().stream()
                .mapToInt(table -> Math.max(0, table.players()))
                .sum();
        return totalPlayers * 20;
    }

    private int sanitizeValue(Map<String, Integer> payload) {
        return Math.max(0, payload.getOrDefault("value", 0));
    }

    private int sanitizeObjectValue(Map<String, Object> payload, String key) {
        if (payload == null) {
            return 0;
        }
        Object raw = payload.get(key);
        if (raw instanceof Number number) {
            return Math.max(0, number.intValue());
        }
        if (raw instanceof String str) {
            try {
                return Math.max(0, Integer.parseInt(str));
            } catch (NumberFormatException ignored) {
                return 0;
            }
        }
        return 0;
    }

    private boolean parseBoolean(Object value, boolean defaultValue) {
        if (value == null) {
            return defaultValue;
        }
        if (value instanceof Boolean bool) {
            return bool;
        }
        if (value instanceof String str) {
            return Boolean.parseBoolean(str);
        }
        if (value instanceof Number number) {
            return number.intValue() != 0;
        }
        return defaultValue;
    }

    private boolean isAdmin(String secret) {
        return adminSecret != null && !adminSecret.isEmpty() && adminSecret.equals(secret);
    }
}
