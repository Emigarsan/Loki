package com.example.counter.service.mesa;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonProperty;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.*;

@Service
public class MesaCounterService {

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

    public static class SpecialDefeat {
        public String key;
        public String avatarName;
        public int mesaId;
        public int mesaNumber;
        public int rupturaAmount;
        public long timestamp;

        @JsonCreator
        public SpecialDefeat(@JsonProperty("key") String key,
                @JsonProperty("avatarName") String avatarName,
                @JsonProperty("mesaId") int mesaId,
                @JsonProperty("mesaNumber") int mesaNumber,
                @JsonProperty("rupturaAmount") int rupturaAmount,
                @JsonProperty("timestamp") long timestamp) {
            this.key = key;
            this.avatarName = avatarName;
            this.mesaId = mesaId;
            this.mesaNumber = mesaNumber;
            this.rupturaAmount = rupturaAmount;
            this.timestamp = timestamp;
        }
    }

    public static class TotalesMesa {
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
    private final List<AvatarDefeat> avatarDefeats = new ArrayList<>();
    private final List<SpecialDefeat> specialDefeats = new ArrayList<>();

    public synchronized void clearAll() {
        totales.clear();
        avatarDefeats.clear();
        specialDefeats.clear();
    }

    public synchronized Map<Integer, TotalesMesa> getTotalesSnapshot() {
        Map<Integer, TotalesMesa> copy = new HashMap<>();
        for (var e : totales.entrySet()) {
            TotalesMesa t = new TotalesMesa();
            TotalesMesa src = e.getValue();
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

    public synchronized List<AvatarDefeat> getAvatarDefeatsLatestFirst() {
        List<AvatarDefeat> copy = new ArrayList<>(avatarDefeats);
        Collections.reverse(copy); // Return in reverse order (most recent first)
        // Exclude special named defeats from general avatar defeats (e.g., Mangog,
        // Portal)
        Set<String> special = new HashSet<>(Arrays.asList("Mangog", "Portal entre dos mundos"));
        List<AvatarDefeat> filtered = new ArrayList<>();
        for (AvatarDefeat a : copy) {
            if (a == null || a.avatarName == null)
                continue;
            if (special.contains(a.avatarName.trim()))
                continue;
            filtered.add(a);
        }
        return filtered;
    }

    public synchronized List<AvatarDefeat> getAvatarDefeatsSnapshot() {
        List<AvatarDefeat> copy = new ArrayList<>(avatarDefeats);
        Set<String> special = new HashSet<>(Arrays.asList("Mangog", "Portal entre dos mundos"));
        List<AvatarDefeat> filtered = new ArrayList<>();
        for (AvatarDefeat a : copy) {
            if (a == null || a.avatarName == null)
                continue;
            if (special.contains(a.avatarName.trim()))
                continue;
            filtered.add(a);
        }
        return filtered;
    }

    public synchronized List<SpecialDefeat> getSpecialDefeatsLatestFirst() {
        List<SpecialDefeat> copy = new ArrayList<>(specialDefeats);
        Collections.reverse(copy);
        return copy;
    }

    public synchronized List<SpecialDefeat> getSpecialDefeatsSnapshot() {
        return new ArrayList<>(specialDefeats);
    }

    private boolean isSpecialAvatarName(String avatarName) {
        if (avatarName == null)
            return false;
        String normalized = avatarName.trim().toLowerCase();
        return "mangog".equals(normalized) || "portal entre dos mundos".equals(normalized);
    }

    private String getSpecialKeyFromName(String avatarName) {
        if (avatarName == null)
            return "special";
        String normalized = avatarName.trim().toLowerCase();
        if ("mangog".equals(normalized))
            return "mangog";
        if ("portal entre dos mundos".equals(normalized))
            return "portal";
        return "special";
    }

    public synchronized void restore(Map<Integer, TotalesMesa> totalesRestored,
            List<AvatarDefeat> avatarDefeatsRestored, List<SpecialDefeat> specialDefeatsRestored) {
        clearAll();
        if (totalesRestored != null) {
            for (var e : totalesRestored.entrySet()) {
                TotalesMesa t = new TotalesMesa();
                TotalesMesa s = e.getValue();
                if (s != null) {
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
        if (avatarDefeatsRestored != null) {
            for (AvatarDefeat defeat : avatarDefeatsRestored) {
                if (defeat == null || defeat.avatarName == null) {
                    continue;
                }
                if (isSpecialAvatarName(defeat.avatarName)) {
                    specialDefeats.add(new SpecialDefeat(
                            getSpecialKeyFromName(defeat.avatarName),
                            defeat.avatarName,
                            defeat.mesaId,
                            defeat.mesaNumber,
                            Math.max(1, defeat.rupturaAmount),
                            defeat.timestamp));
                } else {
                    defeat.rupturaAmount = Math.max(1, defeat.rupturaAmount);
                    avatarDefeats.add(defeat);
                }
            }
        }
        if (specialDefeatsRestored != null) {
            for (SpecialDefeat defeat : specialDefeatsRestored) {
                if (defeat == null)
                    continue;
                defeat.rupturaAmount = Math.max(1, defeat.rupturaAmount);
                if (defeat.key == null || defeat.key.isBlank()) {
                    defeat.key = getSpecialKeyFromName(defeat.avatarName);
                }
                specialDefeats.add(defeat);
            }
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

        // Add rupture counters to total (minimum 1)
        t.rupturaTotal += Math.max(1, rupturaAmount);

        // Record individual defeat event (store rupturaAmount >= 1)
        AvatarDefeat defeat = new AvatarDefeat(avatarName, mesaId, mesaId, Math.max(1, rupturaAmount),
                Instant.now().toEpochMilli());
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
        String cleanName = avatarName.trim();
        if (isSpecialAvatarName(cleanName)) {
            specialDefeats.add(new SpecialDefeat(
                    getSpecialKeyFromName(cleanName),
                    cleanName,
                    normalizedMesaId,
                    normalizedMesaId,
                    Math.max(1, rupturaAmount),
                    Instant.now().toEpochMilli()));
            return;
        }
        avatarDefeats.add(new AvatarDefeat(
                cleanName,
                normalizedMesaId,
                normalizedMesaId,
                Math.max(1, rupturaAmount),
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
