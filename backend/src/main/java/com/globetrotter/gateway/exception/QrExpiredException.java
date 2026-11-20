package com.globetrotter.gateway.exception;

public class QrExpiredException extends RuntimeException {
    public QrExpiredException(String message) {
        super(message);
    }
}
