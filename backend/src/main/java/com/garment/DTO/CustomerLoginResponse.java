package com.garment.DTO;

/**
 * BUG FIX: Field names now match the AppUser TypeScript interface exactly.
 *
 * OLD (broken):
 *   "fullName"     → app expected "name"      → user.name = undefined
 *   "customerType" → app expected "type"      → user.type = undefined
 *   user.type = undefined → getMyPrice() always fell to Retailer price
 *   user.name = undefined → prefill name in Razorpay checkout was empty
 *
 * NEW (fixed):
 *   "name"    → matches AppUser.name    ✓
 *   "type"    → matches AppUser.type    ✓
 *   "partyId" → matches AppUser.partyId ✓  (null until admin links a party)
 */
public class CustomerLoginResponse {

    private String  token;
    private Long    id;
    private String  name;          // ← was "fullName"
    private String  phone;
    private String  email;
    private String  type;          // ← was "customerType"
    private boolean creditEnabled;
    private double  creditLimit;
    private boolean advanceOption;
    private Long    partyId;       // ← null until admin links a party record

    public CustomerLoginResponse(String token, Long id, String name,
                                 String phone, String email, String type,
                                 boolean creditEnabled, double creditLimit,
                                 boolean advanceOption, Long partyId) {
        this.token         = token;
        this.id            = id;
        this.name          = name;
        this.phone         = phone;
        this.email         = email;
        this.type          = type;
        this.creditEnabled = creditEnabled;
        this.creditLimit   = creditLimit;
        this.advanceOption = advanceOption;
        this.partyId       = partyId;
    }

    public String  getToken()         { return token; }
    public Long    getId()            { return id; }
    public String  getName()          { return name; }
    public String  getPhone()         { return phone; }
    public String  getEmail()         { return email; }
    public String  getType()          { return type; }
    public boolean isCreditEnabled()  { return creditEnabled; }
    public double  getCreditLimit()   { return creditLimit; }
    public boolean isAdvanceOption()  { return advanceOption; }
    public Long    getPartyId()       { return partyId; }  // null is fine — Jackson serializes it as null
}