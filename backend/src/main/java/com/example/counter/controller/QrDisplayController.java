package com.example.counter.controller;

import com.example.counter.service.TablesService;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/display")
@CrossOrigin(origins = "*")
public class QrDisplayController {

    private final TablesService tablesService;

    public QrDisplayController(TablesService tablesService) {
        this.tablesService = tablesService;
    }

    @GetMapping("/qr")
    public Map<String, Boolean> getQrFlags() {
        return Map.of(
                "event", tablesService.isEventQrEnabled(),
                "freegame", tablesService.isFreegameQrEnabled()
        );
    }
}
