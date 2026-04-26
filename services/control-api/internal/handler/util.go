package handler

import (
	"encoding/json"
	"net/http"
	"strings"
)

type errorResponse struct {
	Error string `json:"error"`
}

func writeJSON(w http.ResponseWriter, status int, body any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(body)
}

func writeError(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, errorResponse{Error: msg})
}

// isDuplicateKey reports whether err is a Postgres unique-constraint violation
// (SQLSTATE 23505).
func isDuplicateKey(err error) bool {
	return err != nil && strings.Contains(err.Error(), "23505")
}
