output "endereco" {
  description = "Endereço público do Outorga TV na AWS. A família entra em <endereço>casa."
  value       = aws_lightsail_container_service.casa.url
}
