package com.globetrotter.gateway.exception;

public class InvalidQrSignatureException extends RuntimeException {
    public InvalidQrSignatureException(String message) {
        super(message);
    }
}
