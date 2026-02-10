package com.example.counter.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;

@Controller
public class SpaController {
    // Forward non-API SPA routes (without file extensions) to index.html.
    // Supports routes such as /register, /display/qr, /freegame/123, etc.
    @RequestMapping(value = {
            "/{path:^(?!api$|assets$|static$)[^\\.]*$}",
            "/{path:^(?!api$|assets$|static$)[^\\.]*$}/{subpath:^(?!.*\\.).*$}"
    })
    public String forward() {
        return "forward:/index.html";
    }
}
