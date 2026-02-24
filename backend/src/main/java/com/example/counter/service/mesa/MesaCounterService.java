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
        public final int delta; // positive increments, negative decrements
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

    public static class AvatarDefeat {
        public String avatarName;
        public int mesaId;
        public int mesaNumber;
        public int rupturaAmount;
        public long timestamp;

        @JsonCreator
        public AvatarDefeat(@JsonProperty("avatarName") String avatarName,
                @JsonProperty("mesaId") int mesaId,
                @JsonProperty("mesaNumber") int mesaNumber,
                @JsonProperty("rupturaAmount") int rupturaAmount,
                @JsonProperty("timestamp") long timestamp) {
            this.avatarName = avatarName;
            this.mesaId = mesaId;
            this.mesaNumber = mesaNumber;
            this.rupturaAmount = rupturaAmount;
            this.timestamp = timestamp;
        }
    }

    public static class TotalesMesa {
        public int c1;
        public int c2;
        public int c3;
        // New structure for avatar defeats and threat tracking
        public int avatar0; // Granuja defeats
        public int avatar1; // Bribón defeats
        public int avatar2; // Bellaco defeats
        public int avatar3; // Canalla defeats
        public int rupturaTotal; // Total rupture counters
        public int threatFromHeroes; // Threat from hero defeats
        public int threatFromPlan; // Threat from main plan completion
        public Map<String, Integer> defeatedHeroes; // Hero name -> defeat count
        public String tableName; // Mesa name
        public String realityName; // Reality name
        public Integer sectorId; // Sector grouping ID

        public TotalesMesa() {
            this.defeatedHeroes = new HashMap<>();
        }
    }

    private final Map<Integer, TotalesMesa> totales = new HashMap<>();
    private final Set<String> processed = new HashSet<>();
    private final List<Event> eventos = new ArrayList<>();
    private final List<AvatarDefeat> avatarDefeats = new ArrayList<>();

    public synchronized void clearAll() {
        totales.clear();
        processed.clear();
        eventos.clear();
        avatarDefeats.clear();
    }

    public synchronized Map<Integer, TotalesMesa> getTotalesSnapshot() {
        Map<Integer, TotalesMesa> copy = new HashMap<>();
        for (var e : totales.entrySet()) {
            TotalesMesa t = new TotalesMesa();
            TotalesMesa src = e.getValue();
            // Copy legacy counters
            t.c1 = src.c1;
            t.c2 = src.c2;
            t.c3 = src.c3;
            // Copy new structure
            t.avatar0 = src.avatar0;
            t.avatar1 = src.avatar1;
            t.avatar2 = src.avatar2;
            t.avatar3 = src.avatar3;
            t.rupturaTotal = src.rupturaTotal;
            t.threatFromHeroes = src.threatFromHeroes;
            t.threatFromPlan = src.threatFromPlan;
            t.defeatedHeroes = src.defeatedHeroes != null ? new HashMap<>(src.defeatedHeroes) : new HashMap<>();
            t.tableName = src.tableName;
            t.realityName = src.realityName;
            t.sectorId = src.sectorId;
            copy.put(e.getKey(), t);
        }
        return copy;
    }

    public synchronized List<Event> getEventosSnapshot() {
        return new ArrayList<>(eventos);
    }

    public synchronized List<AvatarDefeat> getAvatarDefeatsLatestFirst() {
        List<AvatarDefeat> copy = new ArrayList<>(avatarDefeats);
        Collections.reverse(copy); // Return in reverse order (most recent first)
        return copy;
    }

    public synchronized List<AvatarDefeat> getAvatarDefeatsSnapshot() {
        return new ArrayList<>(avatarDefeats);
    }

    public synchronized boolean applyEvent(String uuid, int mesaId, int contador, int delta, Long ts) {
        if (uuid == null || uuid.isBlank())
            return false;
        if (contador < 1 || contador > 3)
            return false;
        if (processed.contains(uuid))
            return true; // idempotente

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

    public synchronized void restore(Map<Integer, TotalesMesa> totalesRestored, List<Event> eventosRestored,
            List<AvatarDefeat> avatarDefeatsRestored) {
        clearAll();
        if (totalesRestored != null) {
            for (var e : totalesRestored.entrySet()) {
                TotalesMesa t = new TotalesMesa();
                TotalesMesa s = e.getValue();
                if (s != null) {
                    // Copy legacy counters
                    t.c1 = s.c1;
                    t.c2 = s.c2;
                    t.c3 = s.c3;
                    // Copy new structure
                    t.avatar0 = s.avatar0;
                    t.avatar1 = s.avatar1;
                    t.avatar2 = s.avatar2;
                    t.avatar3 = s.avatar3;
                    t.rupturaTotal = s.rupturaTotal;
                    t.threatFromHeroes = s.threatFromHeroes;
                    t.threatFromPlan = s.threatFromPlan;
                    t.defeatedHeroes = s.defeatedHeroes != null ? new HashMap<>(s.defeatedHeroes) : new HashMap<>();
                    t.tableName = s.tableName;
                    t.realityName = s.realityName;
                    t.sectorId = s.sectorId;
                }
                totales.put(e.getKey(), t);
            }
        }
        if (eventosRestored != null) {
            for (Event ev : eventosRestored) {
                if (ev != null && ev.uuid != null)
                    processed.add(ev.uuid);
            }
            eventos.addAll(eventosRestored);
        }
        if (avatarDefeatsRestored != null) {
            avatarDefeats.addAll(avatarDefeatsRestored);
        }
    }

    /**
     * Record an avatar defeat for a specific mesa.
     * 
     * @param mesaId        The table number
     * @param avatarIndex   The avatar index (0-3: Granuja, Bribón, Bellaco,
     *                      Canalla)
     * @param rupturaAmount The number of rupture counters on the avatar
     */
    public synchronized void recordAvatarDefeat(int mesaId, int avatarIndex, int rupturaAmount) {
        TotalesMesa t = totales.computeIfAbsent(Math.max(0, mesaId), k -> new TotalesMesa());

        // Increment the specific avatar defeat counter
        String avatarName = switch (avatarIndex) {
            case 0 -> {
                t.avatar0++;
                yield "Granuja";
            }
            case 1 -> {
                t.avatar1++;
                yield "Bribón";
            }
            case 2 -> {
                t.avatar2++;
                yield "Bellaco";
            }
            case 3 -> {
                t.avatar3++;
                yield "Canalla";
            }
            default -> "Unknown";
        };

        // Add rupture counters to total
        t.rupturaTotal += Math.max(0, rupturaAmount);

        // Record individual defeat event
        AvatarDefeat defeat = new AvatarDefeat(avatarName, mesaId, mesaId, rupturaAmount, Instant.now().toEpochMilli());
        avatarDefeats.add(defeat);
    }

    /**
     * Record a named/special avatar defeat without affecting the 0-3 avatar
     * aggregate counters.
     *
     * @param mesaId        The table number
     * @param avatarName    The defeated avatar name
     * @param rupturaAmount The rupture amount to store with the event
     */
    public synchronized void recordNamedAvatarDefeat(int mesaId, String avatarName, int rupturaAmount) {
        if (avatarName == null || avatarName.isBlank()) {
            return;
        }
        int normalizedMesaId = Math.max(0, mesaId);
        avatarDefeats.add(new AvatarDefeat(
                avatarName.trim(),
                normalizedMesaId,
                normalizedMesaId,
                Math.max(0, rupturaAmount),
                Instant.now().toEpochMilli()));
    }

    /**
     * Record a hero defeat.
     * 
     * @param mesaId       The table number
     * @param heroName     The name of the defeated hero
     * @param threatAmount The threat contributed by the hero defeat
     */
    public synchronized void recordHeroDefeat(int mesaId, String heroName, int threatAmount) {
        TotalesMesa t = totales.computeIfAbsent(Math.max(0, mesaId), k -> new TotalesMesa());

        // Add threat from hero defeats
        t.threatFromHeroes += Math.max(0, threatAmount);

        // Track individual hero defeats
        if (heroName != null && !heroName.isBlank()) {
            t.defeatedHeroes.put(heroName, t.defeatedHeroes.getOrDefault(heroName, 0) + 1);
        }
    }

    /**
     * Record main plan completion.
     * 
     * @param mesaId       The table number
     * @param threatAmount The threat contributed by the plan completion
     */
    public synchronized void recordPlanCompletion(int mesaId, int threatAmount) {
        TotalesMesa t = totales.computeIfAbsent(Math.max(0, mesaId), k -> new TotalesMesa());

        // Add threat from plan completion
        t.threatFromPlan += Math.max(0, threatAmount);
    }
}
