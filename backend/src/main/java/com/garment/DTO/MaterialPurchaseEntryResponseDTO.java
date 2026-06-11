package com.garment.DTO;

import java.util.List;

import com.garment.model.Party;

import lombok.Data;

@Data
public class MaterialPurchaseEntryResponseDTO {

    private Long id;
    private String date;       // "yyyy-MM-dd"
    private String challanNo;

    // Minimal party info for React: entry.party?.partyName
    private Party party;

    // Item list
    private List<MaterialPurchaseEntryItemResponseDTO> items;
}