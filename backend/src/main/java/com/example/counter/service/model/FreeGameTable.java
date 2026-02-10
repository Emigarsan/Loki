package com.example.counter.service.model;

import java.time.Instant;
import java.util.List;

public record FreeGameTable(
        String id,
        int tableNumber,
        String name,
        String difficulty,
        String inevitableChallenge,
        int players,
        List<FreeGamePlayerInfo> playersInfo,
        String code,
        int victoryPoints,
        boolean scenarioCleared,
        Instant createdAt
) {}

