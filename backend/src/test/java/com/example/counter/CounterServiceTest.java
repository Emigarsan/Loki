package com.example.counter;

import com.example.counter.service.CounterService;
import com.example.counter.service.model.CounterState;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class CounterServiceTest {

    private CounterService counterService;

    @BeforeEach
    void setUp() {
        counterService = new CounterService();
    }

    @Test
    void primaryCounterCanBeSet() {
        CounterState updated = counterService.setPrimary(3500);
        assertThat(updated.primary()).isEqualTo(3500);
    }

    @Test
    void initialValuesMatchConfiguredDefaults() {
        CounterState initial = counterService.getState();

        assertThat(initial.primary()).isEqualTo(4000);
        assertThat(initial.tertiary()).isZero();
        assertThat(initial.tertiaryMax()).isEqualTo(CounterService.TERTIARY_MAX_DEFAULT_VALUE);
    }

    @Test
    void tertiaryCanBeSet() {
        CounterState updated = counterService.setTertiary(120);
        assertThat(updated.tertiary()).isEqualTo(120);
    }

    @Test
    void tertiaryMaxCanBeUpdated() {
        CounterState updated = counterService.setTertiaryMax(250);

        assertThat(updated.tertiaryMax()).isEqualTo(250);
    }
}
