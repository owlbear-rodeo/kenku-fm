resource "digitalocean_spaces_bucket" "published_versions" {
  name   = "kenku-fm-${terraform.workspace}"
  acl    = "private"
  region = var.region

  versioning {
    enabled = false
  }
}
