# ============================================================
# AURA Terraform - Main Configuration
# Azure resources are billable. Review `terraform plan` and Azure pricing before apply.
# ============================================================

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.116"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }

  # Uncomment to use Azure backend for state (optional for POC)
  # backend "azurerm" {
  #   resource_group_name  = "aura-tfstate-rg"
  #   storage_account_name = "auratfstate"
  #   container_name       = "tfstate"
  #   key                  = "aura.poc.tfstate"
  # }
}

provider "azurerm" {
  features {}
  subscription_id = var.subscription_id == "" ? null : var.subscription_id
}

resource "random_id" "storage_suffix" {
  byte_length = 4
}

# ── Resource Group ────────────────────────────────────────
resource "azurerm_resource_group" "aura_rg" {
  name     = var.resource_group_name
  location = var.location

  tags = {
    project     = "AURA"
    environment = "poc"
    managed_by  = "terraform"
  }
}

# ── Storage Account (Standard LRS - Free Tier eligible) ──
resource "azurerm_storage_account" "aura_storage" {
  name                     = "aura${random_id.storage_suffix.hex}"
  resource_group_name      = azurerm_resource_group.aura_rg.name
  location                 = azurerm_resource_group.aura_rg.location
  account_tier             = "Standard"
  account_replication_type = "LRS" # Locally redundant - lowest cost

  # Blob properties for static website hosting (optional)
  blob_properties {
    versioning_enabled = false
  }

  tags = {
    project     = "AURA"
    environment = "poc"
  }
}

# ── AKS Cluster (1 node, free tier - For POC) ────────────
resource "azurerm_kubernetes_cluster" "aura_aks" {
  name                = var.cluster_name
  location            = azurerm_resource_group.aura_rg.location
  resource_group_name = azurerm_resource_group.aura_rg.name
  dns_prefix          = "${var.cluster_name}-dns"

  # Free control-plane tier; worker VM, networking, and storage still incur charges.
  sku_tier = "Free"

  default_node_pool {
    name       = "default"
    node_count = 1
    vm_size    = var.node_vm_size

    # Auto-scaling disabled for POC cost control
    enable_auto_scaling = false
  }

  # Use system-assigned managed identity (no SP credentials needed)
  identity {
    type = "SystemAssigned"
  }

  network_profile {
    network_plugin    = "kubenet"
    load_balancer_sku = "standard"
  }

  tags = {
    project     = "AURA"
    environment = "poc"
  }
}
