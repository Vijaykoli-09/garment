package com.garment;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.core.env.Environment;

@SpringBootApplication
public class GarmentApplication {

    private final Environment env;

    public GarmentApplication(Environment env) {
        this.env = env;
    }

    public static void main(String[] args) {
        SpringApplication.run(GarmentApplication.class, args);
    }

    @EventListener(ApplicationReadyEvent.class)
    public void onReady() {
        String port = env.getProperty("local.server.port", env.getProperty("server.port", "8080"));
        System.out.println();
        System.out.println("=====================================================");
        System.out.println("  BACKEND IS LIVE  ->  http://localhost:" + port);
        System.out.println("=====================================================");
        System.out.println();
    }
}