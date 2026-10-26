# ============================================================
# AURA Terraform - Variables
# ============================================================

variable "subscription_id" {
  description = "Azure Subscription ID where resources will be deployed"
  type        = string
  sensitive   = true
  default     = ""
}

variable "resource_group_name" {
  description = "Name of the Azure Resource Group for AURA POC resources"
  type        = string
  default     = "aura-poc-rg"
}

variable "location" {
  description = "Azure region for resource deployment"
  type        = string
  default     = "East US"
}

variable "cluster_name" {
  description = "Name of the AKS Kubernetes cluster"
  type        = string
  default     = "aura-aks-poc"
}

variable "node_vm_size" {
  description = "AKS worker size. Worker nodes incur Azure compute charges."
  type        = string
  default     = "Standard_B2s"
}
