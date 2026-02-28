package com.example.counter.controller;

import com.example.counter.service.TablesService;
import com.example.counter.service.mesa.MesaCounterService;
import com.example.counter.service.model.FreeGameTable;
import com.example.counter.service.model.RegisterTable;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.StringJoiner;

@RestController
@RequestMapping("/api/admin")
@CrossOrigin(origins = "*")
public class AdminController {
    private final TablesService tablesService;
    private final MesaCounterService mesaCounterService;
    private final String adminSecret;

    public AdminController(TablesService tablesService,
            MesaCounterService mesaCounterService,
            @Value("${admin.secret:}") String adminSecret) {
        this.tablesService = tablesService;
        this.mesaCounterService = mesaCounterService;
        this.adminSecret = adminSecret;
    }

    private boolean isAdmin(String secret) {
        return adminSecret != null && !adminSecret.isEmpty() && adminSecret.equals(secret);
    }

    @GetMapping("/tables")
    public ResponseEntity<?> listTables(@RequestHeader(value = "X-Admin-Secret", required = false) String secret) {
        if (!isAdmin(secret))
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        return ResponseEntity.ok(Map.of(
                "register", tablesService.listRegister(),
                "freegame", tablesService.listFreeGame(),
                "qrFlags", buildQrFlags()));
    }

    @PutMapping("/tables/{id}")
    public ResponseEntity<?> updateTable(
            @PathVariable String id,
            @RequestBody Map<String, Object> body,
            @RequestHeader(value = "X-Admin-Secret", required = false) String secret) {
        if (!isAdmin(secret))
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();

        try {
            int tableNumber = ((Number) body.get("tableNumber")).intValue();
            String tableName = (String) body.get("tableName");
            String difficulty = (String) body.get("difficulty");
            int players = ((Number) body.get("players")).intValue();
            @SuppressWarnings("unchecked")
            List<Map<String, String>> playersInfoRaw = (List<Map<String, String>>) body.get("playersInfo");
            String realityId = (String) body.get("realityId");
            String realityName = (String) body.get("realityName");
            Boolean disconnectedRaw = (Boolean) body.get("disconnected");
            boolean disconnected = disconnectedRaw != null && disconnectedRaw;

            List<com.example.counter.service.model.PlayerInfo> playersInfo = playersInfoRaw == null ? List.of()
                    : playersInfoRaw.stream()
                            .map(p -> new com.example.counter.service.model.PlayerInfo(
                                    p.get("character"), p.get("aspect")))
                            .toList();

            boolean updated = tablesService.updateRegisterTable(id, tableNumber, tableName, difficulty,
                    players, playersInfo, realityId, realityName, disconnected);

            if (updated) {
                return ResponseEntity.ok(Map.of("success", true));
            } else {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Mesa no encontrada"));
            }
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", "Datos inválidos: " + e.getMessage()));
        }
    }

    @DeleteMapping("/tables/{id}")
    public ResponseEntity<?> deleteTable(
            @PathVariable String id,
            @RequestHeader(value = "X-Admin-Secret", required = false) String secret) {
        if (!isAdmin(secret))
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();

        boolean deleted = tablesService.deleteRegisterTable(id);
        if (deleted) {
            return ResponseEntity.ok(Map.of("success", true));
        } else {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Mesa no encontrada"));
        }
    }

    @GetMapping(value = "/export/event.csv", produces = "text/csv")
    public ResponseEntity<byte[]> exportEventCsv(
            @RequestHeader(value = "X-Admin-Secret", required = false) String secret) {
        if (!isAdmin(secret))
            return new ResponseEntity<>(HttpStatus.FORBIDDEN);
        List<RegisterTable> reg = tablesService.listRegister();
        String csv = buildRegisterCsv(reg);
        return csvResponse(csv, "event.csv");
    }

    @GetMapping(value = "/export/freegame.csv", produces = "text/csv")
    public ResponseEntity<byte[]> exportFreeGameCsv(
            @RequestHeader(value = "X-Admin-Secret", required = false) String secret) {
        if (!isAdmin(secret))
            return new ResponseEntity<>(HttpStatus.FORBIDDEN);
        List<FreeGameTable> free = tablesService.listFreeGame();
        String csv = buildFreeGameCsv(free);
        return csvResponse(csv, "freegame.csv");
    }

    @GetMapping(value = "/export/mesas_totales.csv", produces = "text/csv")
    public ResponseEntity<byte[]> exportMesaTotalesCsv(
            @RequestHeader(value = "X-Admin-Secret", required = false) String secret) {
        if (!isAdmin(secret))
            return new ResponseEntity<>(HttpStatus.FORBIDDEN);
        Map<Integer, MesaCounterService.TotalesMesa> map = mesaCounterService.getTotalesSnapshot();
        StringJoiner sj = new StringJoiner("\n");
        sj.add("mesa,avatar0,avatar1,avatar2,avatar3,rupturaTotal,threatFromHeroes,threatFromPlan");
        map.entrySet().stream()
                .sorted((a, b) -> Integer.compare(a.getKey(), b.getKey()))
                .forEach(e -> {
                    var t = e.getValue();
                    sj.add(String.join(",",
                            String.valueOf(e.getKey()),
                            String.valueOf(t == null ? 0 : t.avatar0),
                            String.valueOf(t == null ? 0 : t.avatar1),
                            String.valueOf(t == null ? 0 : t.avatar2),
                            String.valueOf(t == null ? 0 : t.avatar3),
                            String.valueOf(t == null ? 0 : t.rupturaTotal),
                            String.valueOf(t == null ? 0 : t.threatFromHeroes),
                            String.valueOf(t == null ? 0 : t.threatFromPlan)));
                });
        String csv = sj.toString() + "\n";
        return csvResponse(csv, "mesas_totales.csv");
    }

    @GetMapping(value = "/export/freegame_scores.csv", produces = "text/csv")
    public ResponseEntity<byte[]> exportFreeGameScoresCsv(
            @RequestHeader(value = "X-Admin-Secret", required = false) String secret) {
        if (!isAdmin(secret))
            return new ResponseEntity<>(HttpStatus.FORBIDDEN);
        List<FreeGameTable> free = tablesService.listFreeGame();
        StringJoiner sj = new StringJoiner("\n");
        sj.add("tableNumber,difficulty,inevitableChallenge,base,legados,victoryPoints,total,scenarioCleared");
        for (FreeGameTable t : free) {
            boolean noCh = t.inevitableChallenge() == null || t.inevitableChallenge().isBlank()
                    || "(Ninguno)".equals(t.inevitableChallenge());
            int base = noCh ? 0 : ("Experto".equalsIgnoreCase(t.difficulty()) ? 5 : 3);
            int legacyCount = 0;
            if (!noCh && t.playersInfo() != null) {
                for (var p : t.playersInfo()) {
                    if (p != null) {
                        String lg = p.legacy();
                        if (lg != null && !lg.isBlank() && !"Ninguno".equalsIgnoreCase(lg))
                            legacyCount++;
                    }
                }
            }
            boolean scenarioCleared = t.scenarioCleared();
            int vp = (noCh || !scenarioCleared) ? 0 : Math.max(0, t.victoryPoints());
            int total = (noCh || !scenarioCleared) ? 0 : (base + legacyCount + vp);
            sj.add(String.join(",",
                    String.valueOf(t.tableNumber()),
                    escape(nullToEmpty(t.difficulty())),
                    escape(nullToEmpty(t.inevitableChallenge())),
                    String.valueOf(base),
                    String.valueOf(legacyCount),
                    String.valueOf(vp),
                    String.valueOf(total),
                    String.valueOf(scenarioCleared)));
        }
        String csv = sj.toString() + "\n";
        return csvResponse(csv, "freegame_scores.csv");
    }

    // XLSX Export Endpoints
    @GetMapping(value = "/export/event.xlsx", produces = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    public ResponseEntity<byte[]> exportEventXlsx(
            @RequestHeader(value = "X-Admin-Secret", required = false) String secret) {
        if (!isAdmin(secret))
            return new ResponseEntity<>(HttpStatus.FORBIDDEN);
        try {
            List<RegisterTable> reg = tablesService.listRegister();
            Map<Integer, MesaCounterService.TotalesMesa> mesaSummary = mesaCounterService.getTotalesSnapshot();
            byte[] xlsx = buildRegisterXlsx(reg, mesaSummary);
            return xlsxResponse(xlsx, "event.xlsx");
        } catch (Exception e) {
            return new ResponseEntity<>(HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @GetMapping(value = "/export/mesas_totales.xlsx", produces = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    public ResponseEntity<byte[]> exportMesaTotalesXlsx(
            @RequestHeader(value = "X-Admin-Secret", required = false) String secret) {
        if (!isAdmin(secret))
            return new ResponseEntity<>(HttpStatus.FORBIDDEN);
        try {
            Map<Integer, MesaCounterService.TotalesMesa> map = mesaCounterService.getTotalesSnapshot();
            byte[] xlsx = buildMesaTotalesXlsx(map);
            return xlsxResponse(xlsx, "mesas_totales.xlsx");
        } catch (Exception e) {
            return new ResponseEntity<>(HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @GetMapping("/qr")
    public ResponseEntity<Map<String, Boolean>> getQrFlags(
            @RequestHeader(value = "X-Admin-Secret", required = false) String secret) {
        if (!isAdmin(secret))
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        return ResponseEntity.ok(buildQrFlags());
    }

    @PostMapping("/qr/event")
    public ResponseEntity<Map<String, Boolean>> setEventQrFlag(
            @RequestHeader(value = "X-Admin-Secret", required = false) String secret,
            @RequestBody Map<String, Object> payload) {
        if (!isAdmin(secret))
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        tablesService.setEventQrEnabled(parseEnabled(payload));
        return ResponseEntity.ok(buildQrFlags());
    }

    @PostMapping("/qr/freegame")
    public ResponseEntity<Map<String, Boolean>> setFreegameQrFlag(
            @RequestHeader(value = "X-Admin-Secret", required = false) String secret,
            @RequestBody Map<String, Object> payload) {
        if (!isAdmin(secret))
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        tablesService.setFreegameQrEnabled(parseEnabled(payload));
        return ResponseEntity.ok(buildQrFlags());
    }

    private String buildRegisterCsv(List<RegisterTable> reg) {
        StringJoiner sj = new StringJoiner("\n");
        // One row per player; repeat table info
        sj.add("id,tableNumber,tableName,difficulty,players,code,createdAt,avatar,playerIndex,character,aspect");
        DateTimeFormatter fmt = DateTimeFormatter.ISO_INSTANT;
        for (RegisterTable t : reg) {
            List<com.example.counter.service.model.PlayerInfo> list = t.playersInfo();
            if (list == null || list.isEmpty()) {
                sj.add(String.join(",",
                        escape(t.id()),
                        String.valueOf(t.tableNumber()),
                        escape(t.tableName()),
                        escape(t.difficulty()),
                        String.valueOf(t.players()),
                        escape(t.code()),
                        escape(fmt.format(t.createdAt())),
                        escape(t.avatar() != null ? t.avatar() : ""),
                        "",
                        "",
                        ""));
                continue;
            }
            for (int i = 0; i < list.size(); i++) {
                var pi = list.get(i);
                sj.add(String.join(",",
                        escape(t.id()),
                        String.valueOf(t.tableNumber()),
                        escape(t.tableName()),
                        escape(t.difficulty()),
                        String.valueOf(t.players()),
                        escape(t.code()),
                        escape(fmt.format(t.createdAt())),
                        escape(t.avatar() != null ? t.avatar() : ""),
                        String.valueOf(i + 1),
                        escape(pi.character()),
                        escape(pi.aspect())));
            }
        }
        return sj.toString() + "\n";
    }

    private String buildFreeGameCsv(List<FreeGameTable> free) {
        StringJoiner sj = new StringJoiner("\n");
        // One row per player; repeat table info
        sj.add("id,tableNumber,name,players,code,createdAt,scenarioCleared,playerIndex,character,aspect,legacy");
        DateTimeFormatter fmt = DateTimeFormatter.ISO_INSTANT;
        for (FreeGameTable t : free) {
            var list = t.playersInfo();
            if (list == null || list.isEmpty()) {
                sj.add(String.join(",",
                        escape(t.id()),
                        String.valueOf(t.tableNumber()),
                        escape(t.name()),
                        String.valueOf(t.players()),
                        escape(t.code()),
                        escape(fmt.format(t.createdAt())),
                        String.valueOf(t.scenarioCleared()),
                        "",
                        "",
                        "",
                        ""));
                continue;
            }
            for (int i = 0; i < list.size(); i++) {
                var pi = list.get(i);
                sj.add(String.join(",",
                        escape(t.id()),
                        String.valueOf(t.tableNumber()),
                        escape(t.name()),
                        String.valueOf(t.players()),
                        escape(t.code()),
                        escape(fmt.format(t.createdAt())),
                        String.valueOf(t.scenarioCleared()),
                        String.valueOf(i + 1),
                        escape(pi.character()),
                        escape(pi.aspect()),
                        escape(pi.legacy())));
            }
        }
        return sj.toString() + "\n";
    }

    private Map<String, Boolean> buildQrFlags() {
        return Map.of(
                "event", tablesService.isEventQrEnabled(),
                "freegame", tablesService.isFreegameQrEnabled());
    }

    private boolean parseEnabled(Map<String, Object> payload) {
        Object raw = payload == null ? null : payload.get("enabled");
        if (raw instanceof Boolean b) {
            return b;
        }
        if (raw instanceof String s) {
            return Boolean.parseBoolean(s);
        }
        if (raw instanceof Number n) {
            return n.intValue() != 0;
        }
        return false;
    }

    private String escape(String v) {
        if (v == null)
            return "";
        boolean needsQuote = v.contains(",") || v.contains("\n") || v.contains("\"");
        String out = v.replace("\"", "\"\"");
        return needsQuote ? ("\"" + out + "\"") : out;
    }

    private String nullToEmpty(String v) {
        return v == null ? "" : v;
    }

    private ResponseEntity<byte[]> csvResponse(String csv, String filename) {
        byte[] bytes = csv.getBytes(StandardCharsets.UTF_8);
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.valueOf("text/csv"));
        headers.set(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"");
        return new ResponseEntity<>(bytes, headers, HttpStatus.OK);
    }

    private ResponseEntity<byte[]> xlsxResponse(byte[] xlsx, String filename) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.valueOf("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"));
        headers.set(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"");
        return new ResponseEntity<>(xlsx, headers, HttpStatus.OK);
    }

    private byte[] buildRegisterXlsx(List<RegisterTable> reg, Map<Integer, MesaCounterService.TotalesMesa> mesaSummary)
            throws Exception {
        Workbook workbook = new XSSFWorkbook();
        Sheet sheet = workbook.createSheet("Event Tables");

        // Header style
        CellStyle headerStyle = workbook.createCellStyle();
        Font headerFont = workbook.createFont();
        headerFont.setBold(true);
        headerStyle.setFont(headerFont);

        // Header row
        Row headerRow = sheet.createRow(0);
        String[] headers = { "ID", "Mesa", "Nombre Mesa", "Dificultad", "Jugadores", "Código", "Fecha",
                "Ruptura Total", "Amenaza Héroes", "Amenaza Plan", "Muertes Héroe",
                "Jugador", "Héroe", "Aspecto", "Realidad" };
        for (int i = 0; i < headers.length; i++) {
            Cell cell = headerRow.createCell(i);
            cell.setCellValue(headers[i]);
            cell.setCellStyle(headerStyle);
        }

        DateTimeFormatter fmt = DateTimeFormatter.ISO_INSTANT;
        int rowNum = 1;

        for (RegisterTable t : reg) {
            MesaCounterService.TotalesMesa totales = mesaSummary.get(t.tableNumber());
            List<com.example.counter.service.model.PlayerInfo> list = t.playersInfo();

            int heroDefeats = 0;

            if (list == null || list.isEmpty()) {
                Row row = sheet.createRow(rowNum++);
                row.createCell(0).setCellValue(nullToEmpty(t.id()));
                row.createCell(1).setCellValue(t.tableNumber());
                row.createCell(2).setCellValue(nullToEmpty(t.tableName()));
                row.createCell(3).setCellValue(nullToEmpty(t.difficulty()));
                row.createCell(4).setCellValue(t.players());
                row.createCell(5).setCellValue(nullToEmpty(t.code()));
                row.createCell(6).setCellValue(fmt.format(t.createdAt()));
                row.createCell(7).setCellValue(totales != null ? totales.rupturaTotal : 0);
                row.createCell(8).setCellValue(totales != null ? totales.threatFromHeroes : 0);
                row.createCell(9).setCellValue(totales != null ? totales.threatFromPlan : 0);
                row.createCell(10).setCellValue(heroDefeats);
                row.createCell(11).setCellValue("");
                row.createCell(12).setCellValue("");
                row.createCell(13).setCellValue("");
                row.createCell(14).setCellValue(nullToEmpty(t.realityName()));
                continue;
            }

            for (int i = 0; i < list.size(); i++) {
                var pi = list.get(i);
                heroDefeats = 0;
                if (totales != null && totales.defeatedHeroes != null && pi != null && pi.character() != null) {
                    heroDefeats = totales.defeatedHeroes.getOrDefault(pi.character(), 0);
                }
                Row row = sheet.createRow(rowNum++);
                row.createCell(0).setCellValue(nullToEmpty(t.id()));
                row.createCell(1).setCellValue(t.tableNumber());
                row.createCell(2).setCellValue(nullToEmpty(t.tableName()));
                row.createCell(3).setCellValue(nullToEmpty(t.difficulty()));
                row.createCell(4).setCellValue(t.players());
                row.createCell(5).setCellValue(nullToEmpty(t.code()));
                row.createCell(6).setCellValue(fmt.format(t.createdAt()));
                row.createCell(7).setCellValue(totales != null ? totales.rupturaTotal : 0);
                row.createCell(8).setCellValue(totales != null ? totales.threatFromHeroes : 0);
                row.createCell(9).setCellValue(totales != null ? totales.threatFromPlan : 0);
                row.createCell(10).setCellValue(heroDefeats);
                row.createCell(11).setCellValue(i + 1);
                row.createCell(12).setCellValue(nullToEmpty(pi.character()));
                row.createCell(13).setCellValue(nullToEmpty(pi.aspect()));
                row.createCell(14).setCellValue(nullToEmpty(t.realityName()));
            }
        }

        // Auto-size columns
        for (int i = 0; i < headers.length; i++) {
            sheet.autoSizeColumn(i);
        }

        ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
        workbook.write(outputStream);
        workbook.close();
        return outputStream.toByteArray();
    }

    private byte[] buildMesaTotalesXlsx(Map<Integer, MesaCounterService.TotalesMesa> map) throws Exception {
        Workbook workbook = new XSSFWorkbook();
        Sheet sheet = workbook.createSheet("Totales por Mesa");

        // Header style
        CellStyle headerStyle = workbook.createCellStyle();
        Font headerFont = workbook.createFont();
        headerFont.setBold(true);
        headerStyle.setFont(headerFont);

        // Header row
        Row headerRow = sheet.createRow(0);
        String[] headers = { "Mesa", "Avatar Granuja", "Avatar Bribón", "Avatar Bellaco", "Avatar Canalla",
                "Ruptura Total", "Amenaza Héroes", "Amenaza Plan", "Héroes Derrotados" };
        for (int i = 0; i < headers.length; i++) {
            Cell cell = headerRow.createCell(i);
            cell.setCellValue(headers[i]);
            cell.setCellStyle(headerStyle);
        }

        int rowNum = 1;
        for (var entry : map.entrySet().stream().sorted((a, b) -> Integer.compare(a.getKey(), b.getKey())).toList()) {
            var t = entry.getValue();
            Row row = sheet.createRow(rowNum++);

            // Build defeated heroes string
            String defeatedHeroesStr = "";
            if (t != null && t.defeatedHeroes != null && !t.defeatedHeroes.isEmpty()) {
                defeatedHeroesStr = t.defeatedHeroes.entrySet().stream()
                        .map(e -> e.getKey() + " x" + e.getValue())
                        .reduce((a, b) -> a + ", " + b)
                        .orElse("");
            }

            row.createCell(0).setCellValue(entry.getKey());
            row.createCell(1).setCellValue(t != null ? t.avatar0 : 0);
            row.createCell(2).setCellValue(t != null ? t.avatar1 : 0);
            row.createCell(3).setCellValue(t != null ? t.avatar2 : 0);
            row.createCell(4).setCellValue(t != null ? t.avatar3 : 0);
            row.createCell(5).setCellValue(t != null ? t.rupturaTotal : 0);
            row.createCell(6).setCellValue(t != null ? t.threatFromHeroes : 0);
            row.createCell(7).setCellValue(t != null ? t.threatFromPlan : 0);
            row.createCell(8).setCellValue(defeatedHeroesStr);
        }

        // Auto-size columns
        for (int i = 0; i < headers.length; i++) {
            sheet.autoSizeColumn(i);
        }

        ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
        workbook.write(outputStream);
        workbook.close();
        return outputStream.toByteArray();
    }
}
