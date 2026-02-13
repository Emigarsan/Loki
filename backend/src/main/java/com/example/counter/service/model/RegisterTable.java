package com.example.counter.service.model;

import java.time.Instant;
import java.util.List;

public record RegisterTable(
                String id,
                int tableNumber,
                String tableName,
                String difficulty,
                int players,
                List<PlayerInfo> playersInfo,
                String code,
                Instant createdAt,
                String avatar) {
}
