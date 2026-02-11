package com.example.counter.service;

import com.example.counter.service.model.CounterState;
import org.springframework.stereotype.Service;

@Service
public class CounterService {
    public static final int SECONDARY_IMAGE_COUNT = 7;
    private static final int PRIMARY_DEFAULT_VALUE = 1792;
    private static final int SECONDARY_DEFAULT_VALUE = 128;
    private static final int TERTIARY_DEFAULT_VALUE = 640;
    public static final int TERTIARY_MAX_DEFAULT_VALUE = 0;

    private int primary = PRIMARY_DEFAULT_VALUE;
    private int secondary = SECONDARY_DEFAULT_VALUE;
    private int tertiary = TERTIARY_DEFAULT_VALUE;
    private int secondaryImageIndex = 0;
    private int tertiaryMax = TERTIARY_MAX_DEFAULT_VALUE;

    public synchronized CounterState getState() {
        return snapshot();
    }

    public synchronized CounterState incrementPrimary(int amount) {
        primary += sanitize(amount);
        return snapshot();
    }

    public synchronized CounterState decrementPrimary(int amount) {
        primary = Math.max(0, primary - sanitize(amount));
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
                // If we are not on the last image, advance and reset.
                if (secondaryImageIndex < SECONDARY_IMAGE_COUNT - 1) {
                    advanceSecondaryImage();
                    secondary = SECONDARY_DEFAULT_VALUE;
                } else {
                    // On the last image (7th), stay at 0 and do not advance/reset.
                    // This allows the frontend to lock and display the alert.
                }
                break;
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

    // New setters for exact values (used by Admin)
    public synchronized CounterState setPrimary(int value) {
        primary = Math.max(0, value);
        return snapshot();
    }

    public synchronized CounterState setSecondary(int value) {
        secondary = Math.max(0, value);
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

    public synchronized CounterState setSecondaryImageIndex(int index) {
        int normalized = ((index % SECONDARY_IMAGE_COUNT) + SECONDARY_IMAGE_COUNT) % SECONDARY_IMAGE_COUNT;
        secondaryImageIndex = normalized;
        return snapshot();
    }

    private void advanceSecondaryImage() {
        secondaryImageIndex = (secondaryImageIndex + 1) % SECONDARY_IMAGE_COUNT;
    }

    private CounterState snapshot() {
        return new CounterState(primary, secondary, tertiary, secondaryImageIndex, tertiaryMax);
    }

    private int sanitize(int amount) {
        return Math.max(0, amount);
    }
}
