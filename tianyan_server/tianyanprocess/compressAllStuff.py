import json

# 获取字段，若字段不存在则返回 'null'


def get_field(data, keys):
    for key in keys:
        data = data.get(key, 'null')
    return data


def extract_data(output_path):
    # 读取 JSON 文件
    with open(output_path + '/工商信息.json', 'r', encoding='utf-8') as file:
        gongshang_data = json.load(file)

    with open(output_path + '/企业信用评级.json', 'r', encoding='utf-8') as file:
        credit_rating_data = json.load(file)

    with open(output_path + '/司法风险.json', 'r', encoding='utf-8') as file:
        judicial_risk_data = json.load(file)

    with open(output_path + '/主要人员.json', 'r', encoding='utf-8') as file:
        staff_data = json.load(file)

    with open(output_path + '/企业股东.json', 'r', encoding='utf-8') as file:
        shareholder_data = json.load(file)

    with open(output_path + '/疑似实际控制人.json', 'r', encoding='utf-8') as file:
        control_data = json.load(file)

    # 提取工商信息.json中的相关数据
    result = gongshang_data.get('result') or {}
    extracted_data = {
        '工商信息': {
            'result': {
                'name': get_field(result, ['name']),
                'estabishTime': get_field(result, ['estiblishTime']),
                'creditCode': get_field(result, ['creditCode']),
                'orgNumber': get_field(result, ['orgNumber']),
                'companyOrgType': get_field(result, ['companyOrgType']),
                'regInstitute': get_field(result, ['regInstitute']),
                'approvedTime': get_field(result, ['approvedTime']),
                'regLocation': get_field(result, ['regLocation']),
                'regCapital': get_field(result, ['regCapital']),
                'actualCapital': get_field(result, ['actualCapital']),
                'legalPersonName': get_field(result, ['legalPersonName']),
                'taxNumber': get_field(result, ['taxNumber']),
                'industry': get_field(result, ['industry']),
                'base': get_field(result, ['base']),
                'fromTime': get_field(result, ['fromTime']),
                'revokeDate': get_field(result, ['revokeDate']),
                'postalAddress': get_field(result, ['postalAddress']),
                'businessScope': get_field(result, ['businessScope']),
                '"regLocation"': get_field(result, ["regLocation"])
            },
            'staffList': [{
                'typeJoin': get_field(staff, ['typeJoin']),
                'name': get_field(staff, ['name']),
                'id': get_field(staff, ['id'])
            } for staff in result.get('staffList', [])],
            'capital': [{
                'percent': get_field(capital, ['percent']),
                'amomon': get_field(capital, ['amomon']),
                'time': get_field(capital, ['time']),
                'payment': get_field(capital, ['paymet']),
                'capitalActl': get_field(capital, ['capitalActl'])
            } for capital in result.get('capital', [])],
            'changeList': [{
                'changeTime': get_field(change, ['changeTime']),
                'changeItem': get_field(change, ['changeItem']),
                'contentBefore': get_field(change, ['contentBefore']),
                'contentAfter': get_field(change, ['contentAfter']),
                'Number': len(result.get('changeList', []))
            } for change in result.get('changeList', [])]
        }
    }

    # 提取企业信用评级.json中的相关数据
    credit_results = (credit_rating_data.get('result') or {}).get('items', [{}])
    extracted_data['企业信用评级'] = [{
        'ratingCompanyName': get_field(credit_result, ['ratingCompanyName']),
        'alias': get_field(credit_result, ['alias']),
        'gid': get_field(credit_result, ['gid']),
        'ratingDate': get_field(credit_result, ['ratingDate']),
        'ratingOutlook': get_field(credit_result, ['ratingOutlook']),
        'subjectLevel': get_field(credit_result, ['subjectLevel']),
        'total': len((credit_rating_data.get('result') or {}).get('items', []))
    } for credit_result in credit_results]

    # 提取司法风险.json中的相关数据
    judicial_result = judicial_risk_data.get('result') or {}
    extracted_data['司法风险'] = {
        'lawSuitList': [{
            'defendants': get_field(law_suit, ['defendants']),
            'casetype': get_field(law_suit, ['casetype']),
            'casereason': get_field(law_suit, ['casereason'])
        } for law_suit in judicial_result.get('lawSuitList', [])],
        'ktAnnouncementList': [{
            'plaintiffs': get_field(announcement, ['plaintiffs'])
        } for announcement in judicial_result.get('ktAnnouncementList', [])]
    }

    # 提取企业股东.json中的相关数据
    shareholder_results = (shareholder_data.get('result') or {}).get('items', [{}])
    extracted_data['企业股东'] = [{
        'name': get_field(shareholder_result, ['name']),
        'alias': get_field(shareholder_result, ['alias']),
        'type': get_field(shareholder_result, ['type']),
        'capital': [{
            'percent': get_field(capital, ['percent']),
            'time': get_field(capital, ['time']),
            'amomon': get_field(capital, ['amomon']),
            'payment': get_field(capital, ['paymet'])
        } for capital in shareholder_result.get('capital', [])],
        'capitalActl': [{
            'percent': get_field(capital, ['percent']),
            'time': get_field(capital, ['time']),
            'amomon': get_field(capital, ['amomon']),
            'payment': get_field(capital, ['paymet']),
            'capitalActl': get_field(capital, ['capitalActl'])
        } for capital in shareholder_result.get('capitalActl', [])],
        'totalNumber': len(shareholder_results)
    }for shareholder_result in shareholder_results]

    # 提取主要人员.json中的相关数据
    staff_result = staff_data.get('result') or {}
    extracted_data['主要人员'] = {
        'items': [{
            'typeJoin': get_field(staff, ['typeJoin']),
            'name': get_field(staff, ['name']),
            'hcgid': get_field(staff, ['hcgid']),
        } for staff in staff_result.get('items', [])],
        'Number': len(staff_result.get('items', []))
    }

    # 将提取的数据保存为新的 JSON 文件
    with open(output_path + '/extracted_data.json', 'w', encoding='utf-8') as outfile:
        json.dump(extracted_data, outfile, ensure_ascii=False, indent=4)
