import re

# Backend methods from ctrl_methods.txt
backend_path = "D:/qwq/项目/zzznew/app/web/src/lib/ctrl_methods.txt"
with open(backend_path) as f:
    backend = set(line.strip() for line in f if line.strip())

# Frontend methods from api.ts - manually extracted
frontend_methods = {
    # User operations
    "login", "verifyTwoFactorLogin", "register", "requestPasswordReset", "resetPassword", 
    "logout", "self", "updateSelf", "deleteSelf", "updateUserSetting", "twoFactorStatus", 
    "setupTwoFactor", "enableTwoFactor", "disableTwoFactor", "regenerateBackupCodes",
    
    # OAuth/Passkey
    "passkeyStatus", "passkeyRegisterBegin", "passkeyRegisterFinish", "deletePasskey",
    "oauthBindings", "unbindOAuth", "weChatAuth", "weChatBind", "weChatLogin",
    "telegramBind", "telegramLogin", "emailBind", "loginByTelegram", "loginByWeChat",
    
    # 2FA
    "adminTwoFactorStats", "twoFactorStatus", "setupTwoFactor", "enableTwoFactor", 
    "disableTwoFactor", "regenerateBackupCodes", "verifyTwoFactorLogin",
    
    # Authentication
    "status", "notice", "login", "register", "verifyTwoFactorLogin",
    "requestPasswordReset", "resetPassword", "logout", "weChatLogin",
    
    # User/Email
    "checkinStatus", "checkin", "affCode", "transferAffQuota", "confirmPaymentCompliance",
    "channelAffinityCache", "clearChannelAffinityCache", "getChannelAffinitySetting",
    "updateChannelAffinitySetting", "getRatioConfig", "resetModelRatio",
    
    # WaffoPancake
    "waffoPancakeCatalog", "waffoPancakePair", "waffoPancakeSave", "waffoPancakeSubscriptionProduct",
    "waffoPancakeSubscriptionProductOptions",
    
    # Topups/Payments
    "topupInfo", "requestPayment", "requestStripePayment", "requestCreemPayment", 
    "requestWaffoPayment", "requestWaffoPancakePayment",
    
    # Admin
    "adminSubscriptionPlans", "updateSubscriptionPlanStatus", "createSubscriptionPlan",
    "updateSubscriptionPlan", "adminTopups", "completeTopup", "reconcileEpay",
    
    # Subscriptions
    "subscriptionPlans", "mySubscription", "updateSubscriptionPreference",
    "purchaseSubscription", "purchaseSubscriptionEpay", "purchaseSubscriptionStripe",
    "purchaseSubscriptionCreem", "purchaseSubscriptionWaffo",
    
    # Tokens
    "tokens", "addToken", "updateToken", "deleteTokenBatch", "tokenKeysBatch",
    
    # User management
    "manageUser",
    
    # Logs
    "logs", "logStats", "logAffinityUsageCache", "searchAllLogs",
    
    # Channels
    "channels",
    
    # Models
    "models", "previewModelSync", "syncUpstreamModels", "missingModels",
    
    # Vendors
    "vendors", "addVendor", "updateVendor", "deleteVendor",
    
    # Redemptions
    "redemptions",
    
    # Fingerprints
    "fingerprints", "fingerprintUsers", "duplicateFingerprints",
    
    # Pricing
    "pricing", "userModels",
    
    # Tasks
    "tasks", "midjourneyTasks", "activeTaskHistory", "activeTaskStats",
    
    # User logs
    "userLogStats",
    
    # Marketplace
    "playground", "playgroundStream",
    
    # Subscriptions admin
    "listUserSubscriptions", "createUserSubscription", "resetUserSubscriptions",
    "resetPlanSubscriptions", "invalidateUserSubscription", "deleteUserSubscription",
    
    # Redemptions
    "redemptions",
    
    # Channels admin
    "updateChannelStatus",
    
    # OAuth providers admin
    "oauthProviders", "createOAuthProvider", "updateOAuthProvider", "deleteOAuthProvider",
    
    # Models admin
    "adminListModels", "updateModelMeta", "createModelMeta", "deleteModelMeta",
    
    # Vendors admin
    "adminListVendors", "updateVendorMeta", "createVendorMeta", "deleteVendorMeta",
    
    # WaffoPancake admin
    "adminWaffoPancake", "updateWaffoPancake", "createWaffoPancake", "deleteWaffoPancake",
}

# Helper: convert Go PascalCase to lowerCamelCase
def go_to_camel(go):
    # Handle common patterns
    if go == "GetSelf": return "self"
    if go == "UpdateSelf": return "updateSelf"
    if go == "DeleteSelf": return "deleteSelf"
    if go == "Login": return "login"
    if go == "Logout": return "logout"
    if go == "Register": return "register"
    if go == "Status": return "status"
    if go == "ResetPassword": return "resetPassword"
    if go == "RequestPasswordReset": return "requestPasswordReset"
    if go == "TwoFactorStatus": return "twoFactorStatus"
    if go == "SetupTwoFactor": return "setupTwoFactor"
    if go == "EnableTwoFactor": return "enableTwoFactor"
    if go == "DisableTwoFactor": return "disableTwoFactor"
    if go == "RegenerateBackupCodes": return "regenerateBackupCodes"
    
    # General conversion
    parts = re.findall(r'[A-Z][a-z]*|[A-Z]+|[a-z]+|\d+', go)
    if not parts: return go
    head = parts[0].lower()
    rest = ''.join(p[0].upper() + p[1:].lower() if p and p[0].isupper() else p.lower() for p in parts[1:])
    return head + rest

# Build mapping
mapping = {}
for go in sorted(backend):
    camel = go_to_camel(go)
    if camel in frontend_methods:
        mapping[go] = (camel, 'OK')
    else:
        mapping[go] = (None, 'MISSING')

# Print missing
missing = [(go, mapping[go][0]) for go in sorted(mapping) if mapping[go][1] == 'MISSING']

print(f"Total backend methods: {len(backend)}")
print(f"Total frontend wrappers: {len(frontend_methods)}")
print(f"\n=== MISSING FRONTEND COVERAGE ({len(missing)} methods) ===")
for go, cam in missing[:100]:
    print(f"  {go}  ->  expected: {cam}")
if len(missing) > 100:
    print(f"  ... and {len(missing) - 100} more")

print(f"\n=== SUMMARY ===")
print(f"✅ Covered: {len(backend) - len(missing)} / {len(backend)} ({((len(backend) - len(missing)) / len(backend) * 100):.1f}%)")
print(f"❌ Missing: {len(missing)} methods")

print(f"\n=== KEY MISSING ADMIN FUNCTIONALITIES ===")
key_missing = [
    "Admin2FAStats", "AdminBindSubscription", "AdminClearUserBinding",
    "AdminCreateSubscriptionPlan", "AdminCreateUserSubscription", "AdminDeleteUserSubscription",
    "AdminDisable2FA", "AdminInvalidateUserSubscription", "AdminListSubscriptionPlans",
    "AdminListUserSubscriptions", "AdminReconcileEpay", "AdminResetPasskey",
    "AdminResetPlanSubscriptions", "AdminResetUserSubscriptionsByPlan",
    "AdminUpdateSubscriptionPlan", "AdminUpdateSubscriptionPlanStatus"
]
for go in key_missing:
    print(f"  {go} (admin functionality)")
