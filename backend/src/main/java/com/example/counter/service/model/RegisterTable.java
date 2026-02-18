package com.example.counter.service.model;

import java.time.Instant;
import java.util.List;
import java.util.Map;

public record RegisterTable(
                String id,
                int tableNumber,
                String tableName,
                String difficulty,
                int players,
                List<PlayerInfo> playersInfo,
                String code,
                Instant createdAt,
                String avatar,
                Map<String, Integer> defeatedHeroes) {
}
