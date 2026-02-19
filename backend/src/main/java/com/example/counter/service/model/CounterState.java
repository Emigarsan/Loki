package com.example.counter.service.model;

import com.fasterxml.jackson.annotation.JsonProperty;

public class CounterState {
    @JsonProperty("primary")
    public final int primary;
    @JsonProperty("tertiary")
    public final int tertiary;
    @JsonProperty("tertiaryMax")
    public final Integer tertiaryMax;
    @JsonProperty("secondaryHeroes")
    public final Integer secondaryHeroes;
    @JsonProperty("secondaryPlan")
    public final Integer secondaryPlan;

    public CounterState() {
        this(0, 0, null, null, null);
    }

    public CounterState(int primary, int tertiary, Integer tertiaryMax, Integer secondaryHeroes, Integer secondaryPlan) {
        this.primary = primary;
        this.tertiary = tertiary;
        this.tertiaryMax = tertiaryMax;
        this.secondaryHeroes = secondaryHeroes;
        this.secondaryPlan = secondaryPlan;
    }

    // Getters for record-like access
    public int primary() { return primary; }
    public int tertiary() { return tertiary; }
    public Integer tertiaryMax() { return tertiaryMax; }
    public Integer secondaryHeroes() { return secondaryHeroes; }
    public Integer secondaryPlan() { return secondaryPlan; }

    @Override
    public String toString() {
        return "CounterState{" +
                "primary=" + primary +
                ", tertiary=" + tertiary +
                ", tertiaryMax=" + tertiaryMax +
                ", secondaryHeroes=" + secondaryHeroes +
                ", secondaryPlan=" + secondaryPlan +
                '}';
    }
}
