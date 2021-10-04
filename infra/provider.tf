terraform {

  required_providers {
    digitalocean = {
      source  = "digitalocean/digitalocean"
      version = "~> 2.0"
    }
  }

  backend "remote" {
    organization = "owlbear-rodeo"

    workspaces {
      prefix = "kenku-fm-"
    }
  }
}


provider "digitalocean" {
  token = var.do_token
}