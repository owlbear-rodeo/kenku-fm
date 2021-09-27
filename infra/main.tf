resource "aws_s3_bucket" "published_versions" {
  bucket = "kenku-fm-${terraform.workspace}"
  acl    = "private"

  versioning {
    enabled = false
  }
}