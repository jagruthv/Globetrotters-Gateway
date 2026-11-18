package com.globetrotter.gateway.model;

import com.fasterxml.jackson.annotation.JsonBackReference;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "circuit_places")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CircuitPlace {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "circuit_id", nullable = false)
    @JsonBackReference
    private Circuit circuit;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "place_id", nullable = false)
    private Place place;

    private Integer sequenceOrder; // 1, 2, 3...
    private Integer estimatedDurationMins; // e.g. 90
    private String transitNote; // e.g. "15 mins via Beach Road Bus/Taxi"
}
