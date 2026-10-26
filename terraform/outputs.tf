# ============================================================
# AURA Terraform - Outputs
# ============================================================

output "resource_group_id" {
  description = "The ID of the AURA resource group"
  value       = azurerm_resource_group.aura_rg.id
}

output "storage_account_endpoint" {
  description = "The primary blob endpoint of the AURA storage account"
  value       = azurerm_storage_account.aura_storage.primary_blob_endpoint
}

output "aks_cluster_id" {
  description = "The resource ID of the AKS cluster"
  value       = azurerm_kubernetes_cluster.aura_aks.id
}

output "kube_config" {
  description = "Raw kubeconfig for connecting to the AKS cluster"
  value       = azurerm_kubernetes_cluster.aura_aks.kube_config_raw
  sensitive   = true
}

output "aks_cluster_fqdn" {
  description = "The FQDN of the AKS cluster"
  value       = azurerm_kubernetes_cluster.aura_aks.fqdn
}
