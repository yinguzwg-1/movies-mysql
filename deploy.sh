#!/bin/bash

# 数据库部署脚本
# 支持增量部署和完整部署

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 打印带颜色的消息
print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# 显示帮助信息
show_help() {
    echo "数据库部署脚本"
    echo ""
    echo "用法:"
    echo "  $0 [命令] [选项]"
    echo ""
    echo "命令:"
    echo "  export [环境]             导出指定环境的数据库"
    echo "  import [环境]             导入数据库到指定环境"
    echo "  full [源环境] [目标环境]       完整部署"
    echo "  incremental [源环境] [目标环境]  增量部署"
    echo "  backup [环境]             备份指定环境的数据库"
    echo "  restore [环境] [备份文件]   从备份文件恢复数据库"
    echo ""
    echo "环境选项:"
    echo "  development, test, staging, production"
    echo ""
    echo "选项:"
    echo "  -o, --output <文件>       指定输出文件"
    echo "  -i, --input <文件>        指定输入文件"
    echo "  -e, --execute             自动执行部署"
    echo "  -f, --force               强制执行（跳过确认）"
    echo "  -h, --help                显示帮助信息"
    echo ""
    echo "示例:"
    echo "  $0 export development"
    echo "  $0 import production -i database.sql"
    echo "  $0 full development production -f"
    echo "  $0 incremental development staging -e"
    echo "  $0 backup production"
    echo "  $0 restore staging backup_20250101.sql"
}

# 检查依赖
check_dependencies() {
    if ! command -v node &> /dev/null; then
        print_error "Node.js 未安装"
        exit 1
    fi
    
    if ! command -v mysql &> /dev/null; then
        print_warning "MySQL 客户端未安装，某些功能可能不可用"
    fi
}

# 导出数据库
export_database() {
    local env=$1
    local output_file=$2
    
    print_info "导出数据库 (环境: $env)"
    
    if [ -n "$output_file" ]; then
        node src/export.js export -o "$output_file"
    else
        node src/export.js export
    fi
    
    print_success "数据库导出完成"
}

# 导入数据库
import_database() {
    local env=$1
    local input_file=$2
    
    print_info "导入数据库 (环境: $env)"
    
    if [ -n "$input_file" ]; then
        node src/export.js import -i "$input_file"
    else
        node src/export.js import
    fi
    
    print_success "数据库导入完成"
}

# 增量部署
incremental_deploy() {
    local source_env=$1
    local target_env=$2
    local output_file=$3
    local auto_execute=$4
    
    print_info "增量部署: $source_env -> $target_env"
    
    local cmd="node src/incremental-deploy.js $source_env $target_env"
    
    if [ -n "$output_file" ]; then
        cmd="$cmd -o $output_file"
    fi
    
    if [ "$auto_execute" = "true" ]; then
        cmd="$cmd --execute"
    fi
    
    eval $cmd
    
    print_success "增量部署完成"
}

# 完整部署
full_deploy() {
    local source_env=$1
    local target_env=$2
    local force=$3
    
    print_info "完整部署: $source_env -> $target_env"
    
    if [ "$force" != "true" ]; then
        print_warning "完整部署将使用 IF NOT EXISTS 和 IGNORE 选项，安全地更新数据库！"
        read -p "确认继续吗？(y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            print_info "部署已取消"
            exit 0
        fi
    fi
    
    # 检查 database.sql 文件是否存在
    if [ ! -f "database.sql" ]; then
        print_error "未找到 database.sql 文件"
        exit 1
    fi
    
    print_info "处理 SQL 文件以支持已存在的表..."
    
    # 使用 Node.js 脚本处理 SQL 文件
    local processed_file="database_safe_$(date +%Y%m%d_%H%M%S).sql"
    node src/process-sql.js database.sql "$processed_file"
    
    # 导入到目标数据库
    print_info "导入到目标数据库..."
    node src/export.js import -i "$processed_file"
    
    # 清理临时文件
    rm -f "$processed_file"
    
    print_success "完整部署完成"
}

# 备份数据库
backup_database() {
    local env=$1
    local output_file=$2
    
    print_info "备份数据库 (环境: $env)"
    
    if [ -z "$output_file" ]; then
        output_file="backup_${env}_$(date +%Y%m%d_%H%M%S).sql"
    fi
    
    # 这里需要根据环境配置获取数据库连接信息
    # 为了简化，我们使用导出功能作为备份
    node src/export.js export -o "$output_file"
    
    print_success "数据库备份完成: $output_file"
}

# 恢复数据库
restore_database() {
    local env=$1
    local backup_file=$2
    local force=$3
    
    print_info "恢复数据库 (环境: $env)"
    
    if [ ! -f "$backup_file" ]; then
        print_error "备份文件不存在: $backup_file"
        exit 1
    fi
    
    if [ "$force" != "true" ]; then
        print_warning "恢复操作将覆盖当前数据库的所有数据！"
        read -p "确认继续吗？(y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            print_info "恢复已取消"
            exit 0
        fi
    fi
    
    node src/export.js import -i "$backup_file"
    
    print_success "数据库恢复完成"
}

# 主函数
main() {
    # 检查依赖
    check_dependencies
    
    # 解析命令行参数
    if [ $# -eq 0 ]; then
        show_help
        exit 1
    fi
    
    local command=$1
    shift
    
    case $command in
        "export")
            if [ $# -eq 0 ]; then
                print_error "请指定环境"
                exit 1
            fi
            local env=$1
            shift
            
            local output_file=""
            while [[ $# -gt 0 ]]; do
                case $1 in
                    -o|--output)
                        output_file=$2
                        shift 2
                        ;;
                    *)
                        print_error "未知选项: $1"
                        exit 1
                        ;;
                esac
            done
            
            export_database "$env" "$output_file"
            ;;
            
        "import")
            if [ $# -eq 0 ]; then
                print_error "请指定环境"
                exit 1
            fi
            local env=$1
            shift
            
            local input_file=""
            while [[ $# -gt 0 ]]; do
                case $1 in
                    -i|--input)
                        input_file=$2
                        shift 2
                        ;;
                    *)
                        print_error "未知选项: $1"
                        exit 1
                        ;;
                esac
            done
            
            import_database "$env" "$input_file"
            ;;
            
        "incremental")
            if [ $# -lt 2 ]; then
                print_error "请指定源环境和目标环境"
                exit 1
            fi
            local source_env=$1
            local target_env=$2
            shift 2
            
            local output_file=""
            local auto_execute="false"
            
            while [[ $# -gt 0 ]]; do
                case $1 in
                    -o|--output)
                        output_file=$2
                        shift 2
                        ;;
                    -e|--execute)
                        auto_execute="true"
                        shift
                        ;;
                    *)
                        print_error "未知选项: $1"
                        exit 1
                        ;;
                esac
            done
            
            incremental_deploy "$source_env" "$target_env" "$output_file" "$auto_execute"
            ;;
            
        "full")
            if [ $# -lt 2 ]; then
                print_error "请指定源环境和目标环境"
                exit 1
            fi
            local source_env=$1
            local target_env=$2
            shift 2
            
            local force="false"
            while [[ $# -gt 0 ]]; do
                case $1 in
                    -f|--force)
                        force="true"
                        shift
                        ;;
                    *)
                        print_error "未知选项: $1"
                        exit 1
                        ;;
                esac
            done
            
            full_deploy "$source_env" "$target_env" "$force"
            ;;
            
        "backup")
            if [ $# -eq 0 ]; then
                print_error "请指定环境"
                exit 1
            fi
            local env=$1
            shift
            
            local output_file=""
            while [[ $# -gt 0 ]]; do
                case $1 in
                    -o|--output)
                        output_file=$2
                        shift 2
                        ;;
                    *)
                        print_error "未知选项: $1"
                        exit 1
                        ;;
                esac
            done
            
            backup_database "$env" "$output_file"
            ;;
            
        "restore")
            if [ $# -lt 2 ]; then
                print_error "请指定环境和备份文件"
                exit 1
            fi
            local env=$1
            local backup_file=$2
            shift 2
            
            local force="false"
            while [[ $# -gt 0 ]]; do
                case $1 in
                    -f|--force)
                        force="true"
                        shift
                        ;;
                    *)
                        print_error "未知选项: $1"
                        exit 1
                        ;;
                esac
            done
            
            restore_database "$env" "$backup_file" "$force"
            ;;
            
        -h|--help)
            show_help
            ;;
            
        *)
            print_error "未知命令: $command"
            show_help
            exit 1
            ;;
    esac
}

# 执行主函数
main "$@" 