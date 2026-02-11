package com.example.counter.service;

import com.example.counter.service.model.CounterState;
import org.springframework.stereotype.Service;

@Service
public class CounterService {
    private static final int PRIMARY_DEFAULT_VALUE = 4000;
    private static final int TERTIARY_DEFAULT_VALUE = 0;
    public static final int TERTIARY_MAX_DEFAULT_VALUE = 400;

    private int primary = PRIMARY_DEFAULT_VALUE;
    private int tertiary = TERTIARY_DEFAULT_VALUE;
    private int tertiaryMax = TERTIARY_MAX_DEFAULT_VALUE;

    public synchronized CounterState getState() {
        return snapshot();
    }

    // New setters for exact values (used by Admin)
    public synchronized CounterState setPrimary(int value) {
        primary = Math.max(0, value);
        return snapshot();
    }

    public synchronized CounterState setTertiary(int value) {
        tertiary = Math.max(0, value);
        return snapshot();
    }

    public synchronized CounterState setTertiaryMax(int value) {
        tertiaryMax = Math.max(0, value);
        return snapshot();
    }

    private CounterState snapshot() {
        return new CounterState(primary, tertiary, tertiaryMax);
    }

}
