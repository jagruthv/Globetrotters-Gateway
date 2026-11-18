package com.globetrotter.gateway.model;

import com.fasterxml.jackson.annotation.JsonManagedReference;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(
    name = "circuits",
    indexes = {
        @Index(name = "idx_circuit_slug", columnList = "slug"),
        @Index(name = "idx_circuit_state", columnList = "state"),
        @Index(name = "idx_circuit_active_featured", columnList = "active, featured")
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Circuit {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String title;

    @Column(unique = true, nullable = false)
    private String slug;

    private String state;  // e.g., "Andhra Pradesh", "Rajasthan", "Kerala", "Uttar Pradesh"
    private String region; // e.g., "Coastal Andhra", "Rayalaseema", "Mewar", "Malabar Coast"

    private String tag; // e.g., "Heritage & Culture", "Coastal Discovery", "Nature Escape"

    @Column(length = 500)
    private String summary;

    @Column(columnDefinition = "TEXT")
    private String description;

    private BigDecimal basePrice; // Sum of individual attractions
    private BigDecimal discountedCircuitPrice; // Discounted circuit bundle price

    @Builder.Default
    private Integer validityDays = 3;

    @Column(length = 1000)
    private String bannerImage;

    @Builder.Default
    private Boolean featured = false;

    @Builder.Default
    private Boolean active = true;

    @OneToMany(mappedBy = "circuit", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("sequenceOrder ASC")
    @JsonManagedReference
    @Builder.Default
    private List<CircuitPlace> circuitPlaces = new ArrayList<>();
}
