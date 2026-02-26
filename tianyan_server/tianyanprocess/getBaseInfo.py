# coding=utf-8
#!/usr/bin/python

import requests
import json
import os

# 在 数据中心 -> 我的接口 中获取
# 可以通过环境变量配置，也可以直接修改
token = os.environ.get("TIANYAN_API_TOKEN", "43ed8204-e3a3-4890-ae14-e04c925b28f4")
encode = 'utf-8'

############################
#         接口函数封装
############################


def get_main_person(company_name):
    """
    主要人员
    http://open.api.tianyancha.com/services/open/ic/staff/2.0
    """
    url = "http://open.api.tianyancha.com/services/open/ic/staff/2.0"
    params = {
        "keyword": company_name,
    }
    headers = {"Authorization": token}
    response = requests.get(url, params=params, headers=headers)
    return response.json()


def get_company_credit(company_name):
    """
    企业信用评级
    http://open.api.tianyancha.com/services/open/m/creditRating/2.0
    """
    url = "http://open.api.tianyancha.com/services/open/m/creditRating/2.0"
    params = {
        "keyword": company_name,
        "pageSize": 20,
        "pageNum": 1,
    }
    headers = {"Authorization": token}
    response = requests.get(url, params=params, headers=headers)
    return response.json()


def get_company_holder(company_name):
    """
    企业股东
    http://open.api.tianyancha.com/services/open/ic/holder/2.0
    """
    url = "http://open.api.tianyancha.com/services/open/ic/holder/2.0"
    params = {
        "keyword": company_name,
        "pageSize": 20,
        "pageNum": 1,
    }
    headers = {"Authorization": token}
    response = requests.get(url, params=params, headers=headers)
    return response.json()


def get_legal_risk(company_name):
    """
    司法风险
    http://open.api.tianyancha.com/services/open/cb/judicial/2.0
    """
    url = "http://open.api.tianyancha.com/services/open/cb/judicial/2.0"
    params = {
        "keyword": company_name,
    }
    headers = {"Authorization": token}
    response = requests.get(url, params=params, headers=headers)
    return response.json()


def get_corporate_information(company_name):
    """
    工商信息
    http://open.api.tianyancha.com/services/open/cb/ic/2.0
    """
    url = "http://open.api.tianyancha.com/services/open/cb/ic/2.0"
    params = {
        "keyword": company_name,
    }
    headers = {"Authorization": token}
    response = requests.get(url, params=params, headers=headers)
    return response.json()


def get_suspect_actualControl(company_name):
    """
    疑似实际控制人
    http://open.api.tianyancha.com/services/open/ic/actualControl/3.0
    """
    url = "http://open.api.tianyancha.com/services/open/ic/actualControl/3.0"
    params = {
        "keyword": company_name,
    }
    headers = {"Authorization": token}
    response = requests.get(url, params=params, headers=headers)
    return response.json()


############################
#         工具函数
############################


def save_json_to_folder(folder_path, filename, data):
    """
    将 data（dict）以 JSON 格式保存到指定文件夹中的 filename 文件
    """
    # 如果文件夹不存在，则创建
    if not os.path.exists(folder_path):
        os.makedirs(folder_path)

    file_path = os.path.join(folder_path, filename)
    with open(file_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"[INFO] 数据已保存到: {file_path}")


############################
#         主流程
############################

def search_company_json(output_path, company_name):

    # 2. 创建 / 确定文件夹
    folder_name = output_path
    print(f"[INFO] 将保存到文件夹：{folder_name}")

    # 3. 依次调用 6 个接口，分别保存
    # (1) 主要人员
    main_person_data = get_main_person(company_name)
    save_json_to_folder(folder_name, "主要人员.json", main_person_data)

    # (2) 企业信用评级
    company_credit_data = get_company_credit(company_name)
    save_json_to_folder(folder_name, "企业信用评级.json", company_credit_data)

    # (3) 企业股东
    company_holder_data = get_company_holder(company_name)
    save_json_to_folder(folder_name, "企业股东.json", company_holder_data)

    # (4) 司法风险
    legal_risk_data = get_legal_risk(company_name)
    save_json_to_folder(folder_name, "司法风险.json", legal_risk_data)

    # (5) 工商信息
    corporate_information_data = get_corporate_information(company_name)
    save_json_to_folder(folder_name, "工商信息.json",
                        corporate_information_data)

    # (6) 疑似实际控制人
    suspect_actualControl_data = get_suspect_actualControl(company_name)
    save_json_to_folder(folder_name, "疑似实际控制人.json",
                        suspect_actualControl_data)

    print("[INFO] 所有接口数据保存完毕！")
