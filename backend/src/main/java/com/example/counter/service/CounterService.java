package com.example.counter.service;

import com.example.counter.service.model.CounterState;
import org.springframework.stereotype.Service;

@Service
public class CounterService {
    public static final int SECONDARY_IMAGE_COUNT = 7;
    private static final int PRIMARY_DEFAULT_VALUE = 100;
    private static final int SECONDARY_DEFAULT_VALUE = 28;
    private static final int TERTIARY_DEFAULT_VALUE = 120;

    private int primary = PRIMARY_DEFAULT_VALUE;
    private int secondary = SECONDARY_DEFAULT_VALUE;
    private int tertiary = TERTIARY_DEFAULT_VALUE;
    private int secondaryImageIndex = 0;

    public synchronized CounterState getState() {
        return snapshot();
    }

    public synchronized CounterState incrementPrimary(int amount) {
        primary += sanitize(amount);
        return snapshot();
    }

    public synchronized CounterState decrementPrimary(int amount) {
        primary -= sanitize(amount);
        return snapshot();
    }

    public synchronized CounterState incrementSecondary(int amount) {
        secondary += sanitize(amount);
        return snapshot();
    }

    public synchronized CounterState decrementSecondary(int amount) {
        int steps = sanitize(amount);
        for (int i = 0; i < steps; i++) {
            if (secondary == 0) {
                break;
            }

            secondary -= 1;

            if (tertiary > 0) {
                tertiary -= 1;
            }

            if (secondary == 0) {
                advanceSecondaryImage();
            }
        }
        return snapshot();
    }

    public synchronized CounterState incrementTertiary(int amount) {
        tertiary += sanitize(amount);
        return snapshot();
    }

    public synchronized CounterState decrementTertiary(int amount) {
        tertiary = Math.max(0, tertiary - sanitize(amount));
        return snapshot();
    }

    public synchronized CounterState resetSecondary(int value) {
        secondary = Math.max(0, value);
        return snapshot();
    }

    public synchronized CounterState resetTertiary(int value) {
        tertiary = Math.max(0, value);
        return snapshot();
    }

    private void advanceSecondaryImage() {
        secondaryImageIndex = (secondaryImageIndex + 1) % SECONDARY_IMAGE_COUNT;
    }

    private CounterState snapshot() {
        return new CounterState(primary, secondary, tertiary, secondaryImageIndex);
    }

    private int sanitize(int amount) {
        return Math.max(0, amount);
import org.springframework.stereotype.Service;

import java.util.concurrent.atomic.AtomicInteger;

@Service
public class CounterService {
    private final AtomicInteger counter = new AtomicInteger();

    public int getCurrentValue() {
        return counter.get();
    }

    public int increment(int amount) {
        return counter.addAndGet(amount);
    }

    public int decrement(int amount) {
        return counter.addAndGet(-amount);
    }

    public int reset(int value) {
        counter.set(value);
        return counter.get();
    }
}
