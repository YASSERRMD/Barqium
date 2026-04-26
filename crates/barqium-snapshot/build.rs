fn main() -> Result<(), Box<dyn std::error::Error>> {
    prost_build::compile_protos(
        &[
            "../../proto/config_event.proto",
            "../../proto/audit_event.proto",
            "../../proto/telemetry.proto",
        ],
        &["../../proto/"],
    )?;
    Ok(())
}
