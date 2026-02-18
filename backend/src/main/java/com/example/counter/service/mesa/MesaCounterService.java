package com.example.counter.service.mesa;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonProperty;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.*;

@Service
public class MesaCounterService {

    public static class Event {
        public final String uuid;
        public final int mesaId;
        public final int contador; // 1..3
        public final int delta;    // positive increments, negative decrements
        public final long ts;

        @JsonCreator
        public Event(@JsonProperty("uuid") String uuid,
                     @JsonProperty("mesaId") int mesaId,
                     @JsonProperty("contador") int contador,
                     @JsonProperty("delta") int delta,
                     @JsonProperty("ts") long ts) {
            this.uuid = uuid;
            this.mesaId = mesaId;
            this.contador = contador;
            this.delta = delta;
            this.ts = ts;
        }
    }

    public static class TotalesMesa {
        public int c1;
        public int c2;
        public int c3;
        public int avatar0;
        public int avatar1;
        public int avatar2;
        public int avatar3;
        public int rupturaTotal;
        public int threatFromHeroes;
        public int threatFromPlan;
    }

    private final Map<Integer, TotalesMesa> totales = new HashMap<>();
    private final Set<String> processed = new HashSet<>();
    private final List<Event> eventos = new ArrayList<>();

    public synchronized void clearAll() {
        totales.clear();
        processed.clear();
        eventos.clear();
    }

    public synchronized Map<Integer, TotalesMesa> getTotalesSnapshot() {
        Map<Integer, TotalesMesa> copy = new HashMap<>();
        for (var e : totales.entrySet()) {
            TotalesMesa t = new TotalesMesa();
            t.c1 = e.getValue().c1;
            t.c2 = e.getValue().c2;
            t.c3 = e.getValue().c3;
            t.avatar0 = e.getValue().avatar0;
            t.avatar1 = e.getValue().avatar1;
            t.avatar2 = e.getValue().avatar2;
            t.avatar3 = e.getValue().avatar3;
            t.rupturaTotal = e.getValue().rupturaTotal;
            t.threatFromHeroes = e.getValue().threatFromHeroes;
            t.threatFromPlan = e.getValue().threatFromPlan;
            copy.put(e.getKey(), t);
        }
        return copy;
    }

    public synchronized List<Event> getEventosSnapshot() {
        return new ArrayList<>(eventos);
    }

    public synchronized boolean applyEvent(String uuid, int mesaId, int contador, int delta, Long ts) {
        if (uuid == null || uuid.isBlank()) return false;
        if (contador < 1 || contador > 3) return false;
        if (processed.contains(uuid)) return true; // idempotente

        TotalesMesa t = totales.computeIfAbsent(Math.max(0, mesaId), k -> new TotalesMesa());
        switch (contador) {
            case 1 -> t.c1 += delta;
            case 2 -> t.c2 += delta;
            case 3 -> t.c3 += delta;
        }
        processed.add(uuid);
        long when = ts != null ? ts : Instant.now().toEpochMilli();
        eventos.add(new Event(uuid, mesaId, contador, delta, when));
        return true;
    }

    public synchronized TotalesMesa recordAvatarDefeat(int mesaId, int avatarIndex, int rupturaDelta) {
        TotalesMesa t = totales.computeIfAbsent(Math.max(0, mesaId), k -> new TotalesMesa());
        switch (avatarIndex) {
            case 0 -> t.avatar0 += 1;
            case 1 -> t.avatar1 += 1;
            case 2 -> t.avatar2 += 1;
            case 3 -> t.avatar3 += 1;
            default -> {
                return t;
            }
        }
        if (rupturaDelta > 0) {
            t.rupturaTotal += rupturaDelta;
        }
        return t;
    }

    public synchronized TotalesMesa addThreat(int mesaId, int delta, String source) {
        TotalesMesa t = totales.computeIfAbsent(Math.max(0, mesaId), k -> new TotalesMesa());
        if (delta > 0) {
            if ("hero".equalsIgnoreCase(source)) {
                t.threatFromHeroes += delta;
            } else if ("plan".equalsIgnoreCase(source)) {
                t.threatFromPlan += delta;
            }
        }
        return t;
    }

    public synchronized void restore(Map<Integer, TotalesMesa> totalesRestored, List<Event> eventosRestored) {
        clearAll();
        if (totalesRestored != null) {
            for (var e : totalesRestored.entrySet()) {
                TotalesMesa t = new TotalesMesa();
                TotalesMesa s = e.getValue();
                if (s != null) {
                    t.c1 = s.c1;
                    t.c2 = s.c2;
                    t.c3 = s.c3;
                    t.avatar0 = s.avatar0;
                    t.avatar1 = s.avatar1;
                    t.avatar2 = s.avatar2;
                    t.avatar3 = s.avatar3;
                    t.rupturaTotal = s.rupturaTotal;
                    t.threatFromHeroes = s.threatFromHeroes;
                    t.threatFromPlan = s.threatFromPlan;
                }
                totales.put(e.getKey(), t);
            }
        }
        if (eventosRestored != null) {
            for (Event ev : eventosRestored) {
                if (ev != null && ev.uuid != null) processed.add(ev.uuid);
            }
            eventos.addAll(eventosRestored);
        }
    }
}

