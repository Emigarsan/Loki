package com.example.counter.service;

import com.example.counter.service.model.CounterState;
import org.springframework.stereotype.Service;

@Service
public class CounterService {
    private static final int PRIMARY_DEFAULT_VALUE = 4000;
    private static final int TERTIARY_DEFAULT_VALUE = 0;
    public static final int TERTIARY_MAX_DEFAULT_VALUE = 100;

    private int primary = PRIMARY_DEFAULT_VALUE;
    private int primaryMax = PRIMARY_DEFAULT_VALUE;
    private int tertiary = TERTIARY_DEFAULT_VALUE;
    private int tertiaryMax = TERTIARY_MAX_DEFAULT_VALUE;
    private int secondaryHeroes = 0;
    private int secondaryPlan = 0;

    public synchronized CounterState getState() {
        return snapshot();
    }

    // New setters for exact values (used by Admin)
    public synchronized CounterState setPrimary(int value) {
        int normalized = Math.max(0, value);
        primary = primaryMax > 0 ? Math.min(normalized, primaryMax) : normalized;
        return snapshot();
    }

    public synchronized CounterState setPrimaryMax(int value) {
        primaryMax = Math.max(0, value);
        if (primary > primaryMax) {
            primary = primaryMax;
        }
        return snapshot();
    }

    public synchronized CounterState setPrimaryMaxAndCurrent(int value) {
        primaryMax = Math.max(0, value);
        primary = primaryMax;
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

    public synchronized CounterState setSecondaryHeroes(int value) {
        secondaryHeroes = Math.max(0, value);
        return snapshot();
    }

    public synchronized CounterState setSecondaryPlan(int value) {
        secondaryPlan = Math.max(0, value);
        return snapshot();
    }

    public synchronized CounterState reducePrimary(int delta) {
        primary = Math.max(0, primary - delta);
        return snapshot();
    }

    public synchronized CounterState incrementTertiary(int delta) {
        int safeDelta = Math.max(0, delta);
        int next = tertiary + safeDelta;
        tertiary = tertiaryMax > 0 ? Math.min(next, tertiaryMax) : Math.max(0, next);
        return snapshot();
    }

    private CounterState snapshot() {
        return new CounterState(primary, primaryMax, tertiary, tertiaryMax, secondaryHeroes, secondaryPlan);
    }

}
