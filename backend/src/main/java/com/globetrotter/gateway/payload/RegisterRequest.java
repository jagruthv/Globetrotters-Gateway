package com.globetrotter.gateway.payload;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class RegisterRequest {
    @NotBlank
    @Email
    @Size(max = 100)
    private String email;

    @NotBlank
    @Size(min = 6, max = 128)
    private String password;

    @NotBlank
    @Size(min = 2, max = 50)
    private String fullName;

    @Size(max = 20)
    private String phoneNumber;
}
