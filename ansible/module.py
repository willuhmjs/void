from ansible.module_utils.basic import AnsibleModule
import requests

def main():
    module_args = dict(
        api_url=dict(type='str', required=True),
        auth_token=dict(type='str', required=True, no_log=True),
        name=dict(type='str', required=True),
        endpoints=dict(type='list', required=True)
    )

    module = AnsibleModule(argument_spec=module_args, supports_check_mode=False)

    api_url = module.params['api_url']
    auth_token = module.params['auth_token']
    name = module.params['name']
    endpoints = module.params['endpoints']

    headers = {
        'Authorization': f'Bearer {auth_token}',
        'Content-Type': 'application/json'
    }

    try:
        # Step 1: Check if the token already exists
        print(f"Checking for existing tokens on URL: {api_url}")
        existing_tokens = get_tokens(api_url, headers=headers)
        print(f"Existing tokens retrieved: {list(existing_tokens.keys())}")

        if name in existing_tokens:
            # Step 2: Update the token's endpoints
            print(f"Updating token '{name}' with new endpoints: {endpoints}")
            token_id = existing_tokens[name]['id']
            update_token(api_url,headers, token_id, endpoints)
            print(f"Token '{name}' updated successfully.")
            module.exit_json(changed=True, token=existing_tokens[name]['token'])
        else:
            # Step 3: Create a new token
            print(f"Creating a new token with name '{name}' and endpoints: {endpoints}")
            new_token = create_token(api_url, headers, name, endpoints)
            print(f"New token created successfully")
            module.exit_json(changed=True, token=new_token)
    except requests.exceptions.RequestException as e:
        print(f"API request failed: {str(e)}")
        module.fail_json(msg=f"API request failed: {str(e)}")


def get_tokens(api_url:str, headers: dict) -> dict:
    response = requests.post(
        f"{api_url}/api/admin",
        headers=headers,
        json={"action": "list-tokens"},
        timeout=10
    )
    response.raise_for_status()
    return {token['name']: token for token in response.json()}

def update_token(api_url: str, headers: dict, id, endpoints ):
    update_response = requests.post(
        f"{api_url}/api/admin",
        headers=headers,
        json={
            "action": "update-token-endpoints",
            "data": {"id": id, "endpoints": endpoints}
        },
        timeout=10
    )
    update_response.raise_for_status()

def create_token(api_url: str, headers: dict, name, endpoints) -> str:
    create_payload = {
        "action": "create-token",
        "data": {"name": name, "token": "", "endpoints": endpoints}
    }
    create_response = requests.post(
        f"{api_url}/api/admin",
        headers=headers,
        json=create_payload,
        timeout=10
    )
    create_response.raise_for_status()
    return create_response.json()['token']
if __name__ == '__main__':
    main()