resource "cloudflare_pages_project" "frontend" {
  account_id        = var.cloudflare_account_id
  name              = "arkham-build"
  production_branch = "main"

  build_config = {
    build_caching   = true
    build_command   = "npm run build -w frontend"
    destination_dir = "frontend/dist"
    root_dir        = ""
  }

  source = {
    type = "github"
    config = {
      owner                          = "arkham-build"
      owner_id                       = "206614922"
      path_includes                  = ["*"]
      pr_comments_enabled            = true
      preview_branch_includes        = ["*"]
      preview_deployment_setting     = "all"
      production_branch              = "main"
      production_deployments_enabled = false
      repo_id                        = "815249822"
      repo_name                      = "arkham.build"
    }
  }

  lifecycle {
    prevent_destroy = true
    ignore_changes  = [deployment_configs]
  }
}

resource "cloudflare_pages_domain" "frontend" {
  account_id   = var.cloudflare_account_id
  project_name = cloudflare_pages_project.frontend.name
  name         = "arkham.build"

  lifecycle {
    prevent_destroy = true
  }
}
