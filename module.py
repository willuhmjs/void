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
        print("Checking for existing tokens on URL :", api_url)
        response = requests.post(
            f"{api_url}/api/admin",
            headers=headers,
            json={"action": "list-tokens"}
        )
        response.raise_for_status()
        existing_tokens = {token['name']: token for token in response.json()}

        if name in existing_tokens:
            # Step 2: Update the token's endpoints
            token_id = existing_tokens[name]['id']
            update_response = requests.post(
                f"{api_url}/api/admin",
                headers=headers,
                json={
                    "action": "update-token-endpoints",
                    "data": {"id": token_id, "endpointIds": endpoints}
                }
            )
            update_response.raise_for_status()
            module.exit_json(changed=True, token=existing_tokens[name]['token'])
        else:
            # Step 3: Create a new token
            create_response = requests.post(
                f"{api_url}/api/admin",
                headers=headers,
                json={
                    "action": "create-token",
                    "data": {"name": name, "token": "", "endpointIds": endpoints}
                }
            )
            create_response.raise_for_status()
            new_token = create_response.json()
            module.exit_json(changed=True, token=new_token['token'])
    except requests.exceptions.RequestException as e:
        module.fail_json(msg=f"API request failed: {str(e)}")

if __name__ == '__main__':
    main()
