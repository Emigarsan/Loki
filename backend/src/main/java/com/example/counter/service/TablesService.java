package com.example.counter.service;

import com.example.counter.service.model.FreeGameTable;
import com.example.counter.service.model.PlayerInfo;
import com.example.counter.service.model.RegisterTable;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.ThreadLocalRandom;
import java.util.UUID;

@Service
public class TablesService {
    private final List<RegisterTable> registerTables = new ArrayList<>();
    private final List<FreeGameTable> freeGameTables = new ArrayList<>();
    private final List<String> registerCharacters;
    private final List<String> registerAspects;
    private final List<String> registerSpiderwomanAspects;
    private boolean eventQrEnabled;
    private boolean freegameQrEnabled;

    public TablesService() {
        registerCharacters = List.of(
                "Spiderman (Peter Parker)",
                "Capitana Marvel",
                "Hulka",
                "Hulkling",
                "Iron Man",
                "Pantera Negra (T'Challa)",
                "Capitán América",
                "Ms. Marvel",
                "Thor",
                "Viuda Negra",
                "Dr. Extraño",
                "Hulk",
                "Ojo de Halcón",
                "Spiderwoman",
                "Hombre Hormiga",
                "Avispa",
                "Mercurio",
                "Bruja Escarlata",
                "Groot",
                "Mapache Cohete",
                "Starlord",
                "Gamora",
                "Drax",
                "Veneno",
                "Spectrum",
                "Adam Warlock",
                "Hombre Maravilla",
                "Nebula",
                "Máquina de Guerra",
                "Valquiria",
                "Vision",
                "Ghost-Spider",
                "Spiderman (Miles Morales)",
                "Nova",
                "Ironheart",
                "Spidercerdo",
                "SP//dr",
                "Coloso",
                "Gatasombra",
                "Cíclope",
                "Fénix",
                "Lobezno",
                "Tormenta",
                "Gambito",
                "Pícara",
                "Cable",
                "Dominó",
                "Mariposa Mental",
                "Ángel",
                "Tigra",
                "X-23",
                "Masacre",
                "Bishop",
                "Magik",
                "Hombre de Hielo",
                "Júbilo",
                "Rondador Nocturno",
                "Magneto",
                "María Hill",
                "Nick Furia",
                "Pantera Negra (Shuri)",
                "Seda",
                "Halcón",
                "Hércules",
                "Soldado de Invierno");
        registerAspects = List.of(
                "Agresividad",
                "Justicia",
                "Liderazgo",
                "Protección",
                "Masacrismo");
        registerSpiderwomanAspects = List.of(
                "Agresividad-Justicia",
                "Agresividad-Liderazgo",
                "Agresividad-Masacrismo",
                "Agresividad-Protección",
                "Justicia-Liderazgo",
                "Justicia-Masacrismo",
                "Justicia-Protección",
                "Liderazgo-Masacrismo",
                "Liderazgo-Protección",
                "Masacrismo-Protección");
    }

    public synchronized RegisterTable createRegister(int tableNumber, String tableName, String difficulty, int players,
            List<PlayerInfo> playersInfo, String realityId, String realityName) {
        String id = UUID.randomUUID().toString();
        String code = shortCode();
        if (playersInfo == null)
            playersInfo = List.of();
        List<PlayerInfo> sanitized = sanitizeRegisterPlayers(playersInfo);
        int tn = Math.max(0, tableNumber);
        String avatar = String.valueOf(ThreadLocalRandom.current().nextInt(4));
        RegisterTable t = new RegisterTable(id, tn, tableName, difficulty, Math.max(0, players), sanitized, code,
                Instant.now(), avatar, realityId, realityName);
        registerTables.add(t);
        return t;
    }

    public synchronized boolean joinRegister(String code) {
        return registerTables.stream().anyMatch(t -> t.code().equalsIgnoreCase(code));
    }

    public synchronized com.example.counter.service.model.FreeGameTable createFreeGame(int tableNumber, String name,
            String difficulty, String inevitableChallenge, int players,
            List<com.example.counter.service.model.FreeGamePlayerInfo> playersInfo,
            boolean scenarioCleared) {
        String id = UUID.randomUUID().toString();
        String code = shortCode();
        int tn = Math.max(0, tableNumber);
        List<com.example.counter.service.model.FreeGamePlayerInfo> info = playersInfo == null ? List.of()
                : new ArrayList<>(playersInfo);
        boolean hasChallenge = inevitableChallenge != null && !inevitableChallenge.isBlank()
                && !"(Ninguno)".equalsIgnoreCase(inevitableChallenge);
        boolean normalizedScenario = hasChallenge && scenarioCleared;
        com.example.counter.service.model.FreeGameTable t = new com.example.counter.service.model.FreeGameTable(
                id,
                tn,
                name,
                difficulty == null ? "Normal" : difficulty,
                (inevitableChallenge == null || inevitableChallenge.isBlank()) ? "(Ninguno)" : inevitableChallenge,
                Math.max(0, players),
                info,
                code,
                0,
                normalizedScenario,
                Instant.now());
        freeGameTables.add(t);
        return t;
    }

    public synchronized boolean joinFreeGame(String code) {
        return freeGameTables.stream().anyMatch(t -> t.code().equalsIgnoreCase(code));
    }

    public synchronized boolean setFreeGameVictoryPoints(String id, int victoryPoints, Boolean scenarioCleared) {
        for (int i = 0; i < freeGameTables.size(); i++) {
            var t = freeGameTables.get(i);
            if (t.id().equals(id)) {
                boolean cleared = scenarioCleared == null ? t.scenarioCleared() : scenarioCleared.booleanValue();
                boolean hasChallenge = t.inevitableChallenge() != null
                        && !t.inevitableChallenge().isBlank()
                        && !"(Ninguno)".equalsIgnoreCase(t.inevitableChallenge());
                boolean normalizedScenario = hasChallenge && cleared;
                freeGameTables.set(i, new com.example.counter.service.model.FreeGameTable(
                        t.id(), t.tableNumber(), t.name(), t.difficulty(), t.inevitableChallenge(), t.players(),
                        t.playersInfo(), t.code(), Math.max(0, victoryPoints), normalizedScenario, t.createdAt()));
                return true;
            }
        }
        return false;
    }

    public synchronized List<RegisterTable> listRegister() {
        return Collections.unmodifiableList(new ArrayList<>(registerTables));
    }

    public synchronized RegisterTable findRegisterByNumber(int tableNumber) {
        int tn = Math.max(0, tableNumber);
        for (RegisterTable t : registerTables) {
            if (t.tableNumber() == tn) {
                return t;
            }
        }
        return null;
    }

    public synchronized RegisterTable findRegisterById(String id) {
        for (RegisterTable t : registerTables) {
            if (t.id().equals(id)) {
                return t;
            }
        }
        return null;
    }

    public synchronized boolean updateRegisterTable(String id, int tableNumber, String tableName, String difficulty,
            int players, List<PlayerInfo> playersInfo, String realityId, String realityName) {
        for (int i = 0; i < registerTables.size(); i++) {
            RegisterTable t = registerTables.get(i);
            if (t.id().equals(id)) {
                List<PlayerInfo> sanitized = sanitizeRegisterPlayers(playersInfo == null ? List.of() : playersInfo);
                int tn = Math.max(0, tableNumber);
                RegisterTable updated = new RegisterTable(
                        t.id(),
                        tn,
                        tableName,
                        difficulty,
                        Math.max(0, players),
                        sanitized,
                        t.code(),
                        t.createdAt(),
                        t.avatar(),
                        realityId,
                        realityName);
                registerTables.set(i, updated);
                return true;
            }
        }
        return false;
    }

    public synchronized boolean deleteRegisterTable(String id) {
        return registerTables.removeIf(t -> t.id().equals(id));
    }

    public synchronized List<FreeGameTable> listFreeGame() {
        return Collections.unmodifiableList(new ArrayList<>(freeGameTables));
    }

    public synchronized FreeGameTable findFreeGameByNumber(int tableNumber) {
        int tn = Math.max(0, tableNumber);
        for (FreeGameTable t : freeGameTables) {
            if (t.tableNumber() == tn)
                return t;
        }
        return null;
    }

    public synchronized void restore(List<RegisterTable> reg, List<FreeGameTable> free) {
        registerTables.clear();
        freeGameTables.clear();
        if (reg != null)
            registerTables.addAll(reg);
        if (free != null)
            freeGameTables.addAll(free);
    }

    public synchronized boolean isRegisterTableNumberUsed(int tableNumber) {
        int tn = Math.max(0, tableNumber);
        return registerTables.stream().anyMatch(t -> t.tableNumber() == tn);
    }

    public synchronized boolean isFreeGameTableNumberUsed(int tableNumber) {
        int tn = Math.max(0, tableNumber);
        return freeGameTables.stream().anyMatch(t -> t.tableNumber() == tn);
    }

    public synchronized List<String> getRegisterCharacters() {
        return Collections.unmodifiableList(new ArrayList<>(registerCharacters));
    }

    public synchronized List<String> getRegisterAspects() {
        return Collections.unmodifiableList(new ArrayList<>(registerAspects));
    }

    public synchronized List<String> getRegisterSpiderwomanAspects() {
        return Collections.unmodifiableList(new ArrayList<>(registerSpiderwomanAspects));
    }

    public synchronized boolean isEventQrEnabled() {
        return eventQrEnabled;
    }

    public synchronized boolean isFreegameQrEnabled() {
        return freegameQrEnabled;
    }

    public synchronized void setEventQrEnabled(boolean enabled) {
        this.eventQrEnabled = enabled;
    }

    public synchronized void setFreegameQrEnabled(boolean enabled) {
        this.freegameQrEnabled = enabled;
    }

    private List<PlayerInfo> sanitizeRegisterPlayers(List<PlayerInfo> playersInfo) {
        List<PlayerInfo> out = new ArrayList<>();
        for (PlayerInfo pi : playersInfo) {
            String character = safeTrim(pi == null ? null : pi.character());
            String aspect = safeTrim(pi == null ? null : pi.aspect());

            if (character == null)
                character = "";
            if (aspect == null)
                aspect = "";

            if (equalsIgnoreCase(character, "Adam Warlock")) {
                // Adam Warlock: aspecto vacío y bloqueado
                aspect = "";
            } else if (equalsIgnoreCase(character, "Spider-Woman")) {
                // Spider-Woman: debe estar en la lista combinada, si no, limpiar
                if (!containsIgnoreCase(registerSpiderwomanAspects, aspect)) {
                    aspect = "";
                }
            } else {
                // Otros: deben usar aspectos base simples
                if (!containsIgnoreCase(registerAspects, aspect)) {
                    aspect = "";
                }
            }
            out.add(new PlayerInfo(character, aspect));
        }
        return out;
    }

    private String safeTrim(String s) {
        return s == null ? null : s.trim();
    }

    private boolean equalsIgnoreCase(String a, String b) {
        return a == null ? b == null : b != null && a.equalsIgnoreCase(b);
    }

    private boolean containsIgnoreCase(List<String> list, String value) {
        if (value == null)
            return false;
        for (String item : list) {
            if (item != null && item.equalsIgnoreCase(value))
                return true;
        }
        return false;
    }

    private String shortCode() {
        return UUID.randomUUID().toString().substring(0, 6).toUpperCase();
    }
}
