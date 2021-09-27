terraform {

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 3.0"
    }
  }

  backend "remote" {
    organization = "owlbear-rodeo"

    workspaces {
      prefix = "kenku-fm-"
    }
  }
}

provider "aws" {
  region = "us-east-1"

  default_tags {    
      tags = {      
          app = "kenku-fm"      
          version = "${terraform.workspace}"
        }  
    }
}