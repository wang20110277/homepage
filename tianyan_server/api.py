import os
import uuid
import shutil
import time
import json
import threading
from flask import Flask, request, send_file, jsonify
from tianyanprocess.getBaseInfo import search_company_json
from tianyanprocess.compressAllStuff import extract_data
from tianyanprocess.createReport import create_report

app = Flask(__name__)

# 配置临时文件夹
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
TEMP_FOLDER = os.path.join(BASE_DIR, 'temp_files')
os.makedirs(TEMP_FOLDER, exist_ok=True)


def cleanup_folder(process_dir, delay=30):
    """清理临时文件夹"""
    time.sleep(delay)
    try:
        if os.path.exists(process_dir):
            shutil.rmtree(process_dir, ignore_errors=True)
            app.logger.info(f"清理临时文件: {process_dir}")
    except Exception as e:
        app.logger.error(f"清理失败: {str(e)}")


class TianyanchaError(Exception):
    """天眼查 API 错误"""
    def __init__(self, message, error_code=None):
        self.message = message
        self.error_code = error_code
        super().__init__(self.message)


def check_tianyan_api_response(json_file_path, api_name):
    """
    检查天眼查 API 返回结果是否成功

    Args:
        json_file_path: 保存的 JSON 文件路径
        api_name: API 名称（用于日志）

    Raises:
        TianyanchaError: 如果 API 返回错误
    """
    if not os.path.exists(json_file_path):
        raise TianyanchaError(f"{api_name} 数据文件不存在")

    with open(json_file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    error_code = data.get('error_code')
    message = data.get('message', '未知错误')

    # error_code 为 0 或 None 表示成功
    if error_code is not None and error_code != 0:
        app.logger.error(f"天眼查 API 错误 - {api_name}: error_code={error_code}, message={message}")
        raise TianyanchaError(
            f"天眼查API返回错误: {message}",
            error_code=error_code
        )

    # 检查 result 是否为空
    result = data.get('result')
    if result is None or (isinstance(result, dict) and not result):
        app.logger.warning(f"天眼查 API 返回空结果 - {api_name}")
        # 不抛出错误，因为有些公司可能确实没有某些信息


@app.route('/api/generate_report', methods=['POST'])
def generate_report():
    """
    生成天眼查企业报告API

    接收参数:
        company_name: 企业名称 (必填)

    返回:
        成功: Word文档文件
        失败: JSON错误信息
    """
    process_dir = None
    try:
        # 验证请求格式
        if not request.is_json:
            return jsonify({
                "status": "error",
                "message": "请求必须是JSON格式"
            }), 400

        # 获取企业名称
        data = request.get_json()
        company_name = data.get('company_name', '').strip()

        if not company_name:
            return jsonify({
                "status": "error",
                "message": "必须提供企业名称"
            }), 400

        app.logger.info(f"开始处理企业: {company_name}")

        # 创建唯一处理目录
        process_id = str(uuid.uuid4())
        process_dir = os.path.join(TEMP_FOLDER, process_id)
        os.makedirs(process_dir, exist_ok=True)

        # 定义Word文件路径
        word_filename = f'tianyan_report_{company_name}_{process_id[:8]}.docx'
        word_path = os.path.join(process_dir, word_filename)

        # 执行主要处理逻辑
        app.logger.info(f"步骤1: 调用天眼查API获取数据")
        search_company_json(process_dir, company_name)

        # 检查工商信息（核心数据）是否成功获取
        ic_file = os.path.join(process_dir, "工商信息.json")
        check_tianyan_api_response(ic_file, "工商信息")

        app.logger.info(f"步骤2: 提取和处理数据")
        extract_data(process_dir)

        app.logger.info(f"步骤3: 生成Word报告")
        create_report(process_dir, word_path)

        # 检查Word文件是否生成成功
        if not os.path.exists(word_path):
            return jsonify({
                "status": "error",
                "message": "Word报告生成失败"
            }), 500

        app.logger.info(f"报告生成成功: {word_filename}")

        # 启动后台清理线程
        threading.Thread(
            target=cleanup_folder,
            args=(process_dir,)
        ).start()

        # 返回Word文件
        return send_file(
            word_path,
            as_attachment=True,
            download_name=f'{company_name}_企业报告.docx',
            mimetype='application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        )

    except TianyanchaError as e:
        app.logger.error(f"天眼查 API 错误: {e.message}")
        # 清理临时目录
        if process_dir and os.path.exists(process_dir):
            shutil.rmtree(process_dir, ignore_errors=True)
        return jsonify({
            "status": "error",
            "message": e.message
        }), 400

    except Exception as e:
        app.logger.error(f"生成报告时出错: {str(e)}")
        # 清理临时目录
        if process_dir and os.path.exists(process_dir):
            shutil.rmtree(process_dir, ignore_errors=True)
        return jsonify({
            "status": "error",
            "message": f"处理过程中出错: {str(e)}"
        }), 500


@app.route('/api/search', methods=['POST'])
def search_company():
    """
    搜索企业API - 仅验证企业是否存在

    接收参数:
        company_name: 企业名称 (必填)

    返回:
        成功: JSON 包含企业基本信息
        失败: JSON错误信息
    """
    try:
        # 验证请求格式
        if not request.is_json:
            return jsonify({
                "status": "error",
                "message": "请求必须是JSON格式"
            }), 400

        # 获取企业名称
        data = request.get_json()
        company_name = data.get('company_name', '').strip()

        if not company_name:
            return jsonify({
                "status": "error",
                "message": "必须提供企业名称"
            }), 400

        app.logger.info(f"搜索企业: {company_name}")

        # 调用天眼查 API 获取工商信息
        from tianyanprocess.getBaseInfo import get_corporate_information
        result = get_corporate_information(company_name)

        # 调试日志：打印完整返回结果
        app.logger.info(f"天眼查 API 返回: {json.dumps(result, ensure_ascii=False)[:500]}")

        error_code = result.get('error_code')
        message = result.get('message', '未知错误')

        # error_code 不为 0 或 None 表示错误
        if error_code is not None and error_code != 0:
            app.logger.warning(f"企业不存在: {company_name}, error_code={error_code}, message={message}")
            return jsonify({
                "status": "error",
                "message": f"未找到企业「{company_name}」的相关信息，请检查企业名称是否正确"
            }), 404

        # 检查 result 是否有效（使用与 check_tianyan_api_response 相同的逻辑）
        company_result = result.get('result')
        if company_result is None:
            app.logger.warning(f"企业不存在（result 为 None）: {company_name}")
            return jsonify({
                "status": "error",
                "message": f"未找到企业「{company_name}」的相关信息，请检查企业名称是否正确"
            }), 404

        # result 可能是空字典，但不应该判定为不存在（与 check_tianyan_api_response 保持一致）
        # 只有当 result 为 None 时才判定为不存在

        # 提取企业基本信息（字段名参考 compressAllStuff.py）
        info = company_result if isinstance(company_result, dict) else {}
        company_info = {
            "name": info.get("name") or company_name,
            "legalRepresentative": info.get("legalPersonName", "-"),
            "creditCode": info.get("creditCode", "-"),
            "registeredCapital": info.get("regCapital", "-"),
            "establishDate": info.get("estiblishTime", "-"),
            "status": info.get("regStatus", "-"),
        }

        app.logger.info(f"企业搜索成功: {company_name}, info: {company_info}")

        return jsonify({
            "status": "success",
            "data": company_info
        })

    except Exception as e:
        app.logger.error(f"搜索企业时出错: {str(e)}")
        return jsonify({
            "status": "error",
            "message": f"搜索失败: {str(e)}"
        }), 500


@app.route('/api/health', methods=['GET'])
def health_check():
    """健康检查接口"""
    return jsonify({
        "status": "ok",
        "message": "天眼查API服务运行正常"
    })


if __name__ == '__main__':
    # 确保临时目录存在
    os.makedirs(TEMP_FOLDER, exist_ok=True)

    # 启动Flask应用
    app.run(
        host='0.0.0.0',
        port=5000,
        debug=False,
        threaded=True
    )
